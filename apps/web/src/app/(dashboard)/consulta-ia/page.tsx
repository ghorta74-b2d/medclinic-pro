'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { calculateAge, getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Search, Brain, Mic, Square, CheckCircle2,
  User, ChevronRight, AlertCircle, Loader2,
  FileText, RotateCcw, ArrowRight, CheckSquare,
} from 'lucide-react'
import type { Patient } from 'medclinic-shared'
import { EcgLoader } from '@/components/ui/ecg-loader'

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'patient' | 'consent' | 'microphone' | 'recording' | 'processing' | 'done'

interface SelectedPatient extends Patient {
  secondLastName?: string
  _count?: { appointments: number }
  nextAppointment?: { startsAt: string } | null
}

interface ExtractedData {
  chiefComplaint?: string | null
  evolutionNotes?: string | null
  physicalExam?: string | null
  diagnoses?: string[]
  treatmentPlan?: string | null
  aiSummary?: string
}

interface ProcessResult {
  noteId: string
  patientId: string
  patientName: string
  extracted: ExtractedData
  note: { aiSummary?: string; transcriptDurationSeconds?: number }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function patientFullName(p: SelectedPatient): string {
  return [p.lastName, p.secondLastName, p.firstName].filter(Boolean).join(' ')
}

// ── Microphone helpers ─────────────────────────────────────────────────────────

/** True when getUserMedia is actually usable (needs a secure context: https/localhost). */
function micApiAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  )
}

/** Map a getUserMedia/DOMException to a clear, actionable Spanish message. */
function micErrorMessage(err: unknown): string {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'El navegador bloquea el micrófono en conexiones no seguras. Abre la app con https:// (o en localhost) e inténtalo de nuevo.'
  }
  if (!micApiAvailable()) {
    return 'Tu navegador no permite el acceso al micrófono. Usa una versión reciente de Chrome, Edge o Safari.'
  }
  const name = err instanceof DOMException ? err.name : (err instanceof Error ? err.name : '')
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Permiso de micrófono denegado. Haz clic en el ícono de candado/cámara de la barra de direcciones, permite el micrófono y vuelve a intentarlo.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No se encontró ningún micrófono. Conecta o activa un micrófono y vuelve a intentarlo.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'El micrófono está siendo usado por otra aplicación (Zoom, Meet, etc.). Ciérrala y vuelve a intentarlo.'
    case 'OverconstrainedError':
      return 'El micrófono seleccionado ya no está disponible. Elige otro y vuelve a intentarlo.'
    default:
      return 'No se pudo acceder al micrófono. Verifica los permisos en tu navegador y vuelve a intentarlo.'
  }
}

/** Audio constraints — bind to the chosen device and clean up the signal. */
function audioConstraints(deviceId?: string): MediaStreamConstraints {
  return {
    audio: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  }
}

/** Speech-recognition error codes that are fatal (no point retrying). */
const FATAL_SR_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture'])

/**
 * Whether the browser supports the Web Speech API (transcription happens fully
 * in-browser). Only Chrome/Edge implement it reliably — Safari and Firefox do
 * not, so the feature is gated to Chrome.
 */
function speechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: 'patient',    label: 'Paciente' },
  { id: 'consent',    label: 'Consentimiento' },
  { id: 'microphone', label: 'Micrófono' },
  { id: 'recording',  label: 'Consulta' },
]

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.id === current)
  if (current === 'processing' || current === 'done') return null
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done = i < idx
        const active = i === idx
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                done  ? 'bg-primary text-white' :
                active ? 'bg-primary text-white ring-4 ring-primary/15' :
                         'bg-muted text-muted-foreground'
              )}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={cn('text-xs font-medium', active ? 'text-primary' : done ? 'text-primary' : 'text-muted-foreground')}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('w-8 h-px mx-2', i < idx ? 'bg-primary' : 'bg-muted')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Patient selection ─────────────────────────────────────────────────

function PatientStep({
  onSelect,
}: {
  onSelect: (p: SelectedPatient) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SelectedPatient[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<SelectedPatient | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await api.patients.list({ q, limit: '8' }) as { data: SelectedPatient[] }
      setResults(res.data ?? [])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 350)
    return () => clearTimeout(t)
  }, [query, search])

  return (
    <div className="max-w-xl">
      <StepIndicator current="patient" />

      <h2 className="text-lg font-semibold text-foreground mb-1">Seleccionar paciente</h2>
      <p className="text-sm text-muted-foreground mb-5">Busca al paciente para iniciar la consulta asistida.</p>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o CURP..."
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
      </div>

      {/* Results */}
      {results.length > 0 && !selected && (
        <div className="border border-border rounded-xl overflow-hidden mb-4">
          {results.map(p => (
            <button
              key={p.id}
              onClick={() => { setSelected(p); setQuery(patientFullName(p)); setResults([]) }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-colors text-left border-b border-border last:border-0"
            >
              <div className="w-9 h-9 bg-primary/15 rounded-full flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {getInitials(p.firstName, p.lastName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{patientFullName(p)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.dateOfBirth ? `${calculateAge(p.dateOfBirth)} años` : ''}
                  {p.gender === 'MALE' ? ' · Masculino' : p.gender === 'FEMALE' ? ' · Femenino' : ''}
                  {p.phone ? ` · ${p.phone}` : ''}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Selected patient card */}
      {selected && (
        <div className="bg-primary/10 border border-primary rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
              {getInitials(selected.firstName, selected.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{patientFullName(selected)}</p>
              <p className="text-xs text-muted-foreground">
                {selected.dateOfBirth ? `${calculateAge(selected.dateOfBirth)} años` : ''}
                {selected.gender === 'MALE' ? ' · Masculino' : selected.gender === 'FEMALE' ? ' · Femenino' : ''}
              </p>
              {selected.curp && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{selected.curp}</p>
              )}
            </div>
            <button
              onClick={() => { setSelected(null); setQuery('') }}
              className="text-xs text-primary hover:text-primary shrink-0 font-medium"
            >
              Cambiar
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-white font-semibold py-3 rounded-xl transition-colors text-sm"
      >
        Continuar
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Step 2: Consent ──────────────────────────────────────────────────────────

function ConsentStep({
  patient,
  onConsent,
  onBack,
}: {
  patient: SelectedPatient
  onConsent: (consentAt: string) => void
  onBack: () => void
}) {
  const [checked, setChecked] = useState(false)

  return (
    <div className="max-w-xl">
      <StepIndicator current="consent" />

      <h2 className="text-lg font-semibold text-foreground mb-1">Consentimiento del paciente</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Este paso es requerido por regulación antes de iniciar la grabación de la consulta.
      </p>

      {/* Patient reminder */}
      <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 mb-5">
        <User className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-foreground/80 font-medium">{patientFullName(patient)}</span>
      </div>

      {/* Consent checkbox */}
      <label className={cn(
        'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors mb-6',
        checked ? 'border-primary bg-primary/10' : 'border-border hover:border-border bg-card'
      )}>
        <div className={cn(
          'w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border-2 transition-colors',
          checked ? 'bg-primary border-primary' : 'border-border'
        )}>
          {checked && <CheckSquare className="w-3.5 h-3.5 text-white" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">Consentimiento de grabación</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Confirmo que el paciente <strong>{patientFullName(patient)}</strong> ha otorgado su
            consentimiento verbal y/o escrito para la grabación y transcripción de esta consulta
            con fines clínicos y de documentación médica, de conformidad con la normativa vigente
            (NOM-004-SSA3-2012 y LFPDPPP).
          </p>
        </div>
        <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="sr-only" />
      </label>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold text-foreground/80 hover:bg-muted/50 transition-colors"
        >
          Regresar
        </button>
        <button
          onClick={() => checked && onConsent(new Date().toISOString())}
          disabled={!checked}
          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          Continuar
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Microphone selection ──────────────────────────────────────────────

function MicrophoneStep({
  patient,
  onReady,
  onBack,
}: {
  patient: SelectedPatient
  onReady: (deviceId: string) => void
  onBack: () => void
}) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function detect() {
      setLoading(true)
      setError('')

      if (!micApiAvailable()) {
        if (!cancelled) { setError(micErrorMessage(null)); setLoading(false) }
        return
      }

      let stream: MediaStream | null = null
      try {
        // Request permission first so enumerateDevices can return labels.
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const all = await navigator.mediaDevices.enumerateDevices()
        if (cancelled) return
        const inputs = all.filter(d => d.kind === 'audioinput')
        if (inputs.length === 0) {
          setError('No se encontró ningún micrófono. Conecta o activa un micrófono y vuelve a intentarlo.')
        } else {
          setDevices(inputs)
          setSelected(prev => (prev && inputs.some(d => d.deviceId === prev)) ? prev : inputs[0]!.deviceId)
        }
      } catch (err) {
        if (!cancelled) setError(micErrorMessage(err))
      } finally {
        // Release the permission-test stream so the mic isn't held open.
        stream?.getTracks().forEach(t => t.stop())
        if (!cancelled) setLoading(false)
      }
    }

    detect()

    // Re-detect when the user plugs/unplugs a mic.
    const md = micApiAvailable() ? navigator.mediaDevices : null
    const onChange = () => setAttempt(a => a + 1)
    md?.addEventListener?.('devicechange', onChange)

    return () => {
      cancelled = true
      md?.removeEventListener?.('devicechange', onChange)
    }
  }, [attempt])

  return (
    <div className="max-w-xl">
      <StepIndicator current="microphone" />

      <h2 className="text-lg font-semibold text-foreground mb-1">Selección de micrófono</h2>
      <p className="text-sm text-muted-foreground mb-5">Elige el micrófono que usarás durante la consulta.</p>

      {/* Patient reminder */}
      <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 mb-5">
        <User className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-foreground/80 font-medium">{patientFullName(patient)}</span>
      </div>

      {loading ? (
        <div className="py-6"><EcgLoader size={48} label="Detectando micrófonos disponibles…" /></div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/15 rounded-xl p-4 mb-5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive mb-1">Sin acceso al micrófono</p>
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={() => setAttempt(a => a + 1)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-destructive border border-destructive/30 rounded-lg px-3 py-1.5 hover:bg-destructive/10 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reintentar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 mb-5">
          {devices.map(d => (
            <label
              key={d.deviceId}
              className={cn(
                'flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors',
                selected === d.deviceId ? 'border-primary bg-primary/10' : 'border-border hover:border-border bg-card'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                selected === d.deviceId ? 'border-primary' : 'border-border'
              )}>
                {selected === d.deviceId && <div className="w-2 h-2 bg-primary rounded-full" />}
              </div>
              <Mic className={cn('w-4 h-4 shrink-0', selected === d.deviceId ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-sm font-medium text-foreground truncate">
                {d.label || `Micrófono ${devices.indexOf(d) + 1}`}
              </span>
              <input
                type="radio"
                name="mic"
                value={d.deviceId}
                checked={selected === d.deviceId}
                onChange={() => setSelected(d.deviceId)}
                className="sr-only"
              />
            </label>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold text-foreground/80 hover:bg-muted/50 transition-colors"
        >
          Regresar
        </button>
        <button
          onClick={() => !error && selected && onReady(selected)}
          disabled={!!error || !selected || loading}
          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          <Mic className="w-4 h-4" />
          Iniciar consulta
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Recording ─────────────────────────────────────────────────────────

function RecordingStep({
  patient,
  deviceId,
  onEnd,
}: {
  patient: SelectedPatient
  deviceId: string
  onEnd: (transcript: string, durationSeconds: number) => void
}) {
  const [elapsed, setElapsed] = useState(0)
  const [transcriptDisplay, setTranscriptDisplay] = useState('')
  const [micError, setMicError] = useState('')
  const [fatalMicError, setFatalMicError] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [silent, setSilent] = useState(false)
  const [streamReady, setStreamReady] = useState(false)

  const transcriptRef = useRef('')
  const isRecordingRef = useRef(true)
  const recognitionRef = useRef<unknown>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const heardAudioRef = useRef(false)
  const lastSoundAtRef = useRef(Date.now())

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Hold a real mic stream on the chosen device + measure live audio level.
  // This guarantees the selected microphone is actually engaged (the Web Speech
  // API alone cannot target a device) and gives the user real-time feedback.
  useEffect(() => {
    let cancelled = false

    async function openMic() {
      if (!micApiAvailable()) {
        setMicError(micErrorMessage(null)); setFatalMicError(true)
        return
      }
      try {
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia(audioConstraints(deviceId))
        } catch (err) {
          // The exact device may have vanished — fall back to any microphone.
          if (err instanceof DOMException && err.name === 'OverconstrainedError') {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          } else {
            throw err
          }
        }
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        setStreamReady(true)

        // If the OS/user revokes the mic mid-session, the track ends.
        stream.getAudioTracks().forEach(track => {
          track.onended = () => {
            if (isRecordingRef.current) {
              setMicError('Se perdió la conexión con el micrófono. Verifica el dispositivo y finaliza la sesión.')
            }
          }
        })

        const Ctx: typeof AudioContext | undefined =
          window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (Ctx) {
          const ctx = new Ctx()
          audioCtxRef.current = ctx
          const source = ctx.createMediaStreamSource(stream)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 512
          source.connect(analyser)
          const data = new Uint8Array(analyser.frequencyBinCount)

          const tick = () => {
            analyser.getByteTimeDomainData(data)
            let sum = 0
            for (let i = 0; i < data.length; i++) {
              const v = (data[i]! - 128) / 128
              sum += v * v
            }
            const rms = Math.sqrt(sum / data.length)
            const level = Math.min(1, rms * 3)
            setMicLevel(level)
            const now = Date.now()
            if (level > 0.05) { heardAudioRef.current = true; lastSoundAtRef.current = now; setSilent(false) }
            // After a 4s grace period, warn if no audio for 7s straight.
            else if (heardAudioRef.current && now - lastSoundAtRef.current > 7000) { setSilent(true) }
            else if (!heardAudioRef.current && now - lastSoundAtRef.current > 4000) { setSilent(true) }
            rafRef.current = requestAnimationFrame(tick)
          }
          rafRef.current = requestAnimationFrame(tick)
        }
      } catch (err) {
        if (!cancelled) { setMicError(micErrorMessage(err)); setFatalMicError(true) }
      }
    }

    openMic()

    return () => {
      cancelled = true
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      audioCtxRef.current?.close().catch(() => {})
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [deviceId])

  // Speech recognition for the live transcript preview.
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    const recog = new SR() as any
    recog.lang = 'es-MX'
    recog.continuous = true
    recog.interimResults = true
    recognitionRef.current = recog

    recog.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          transcriptRef.current += (result[0].transcript as string) + ' '
        } else {
          interim += result[0].transcript as string
        }
      }
      setTranscriptDisplay(transcriptRef.current + (interim ? `[${interim}]` : ''))
    }

    recog.onerror = (event: any) => {
      const code = event?.error as string | undefined
      if (code && FATAL_SR_ERRORS.has(code)) {
        // Permission revoked or no capture device — stop retrying.
        isRecordingRef.current = false
        setMicError(
          code === 'audio-capture'
            ? 'Se perdió el micrófono durante la grabación. Verifica el dispositivo y finaliza la sesión.'
            : 'El navegador bloqueó el micrófono durante la grabación. Revisa los permisos y finaliza la sesión.'
        )
      } else if (code === 'network') {
        setMicError('La transcripción en vivo perdió conexión. La grabación continúa; el texto se recuperará al reanudar.')
      }
      // 'no-speech' / 'aborted' are transient — onend will restart.
    }

    recog.onend = () => {
      if (isRecordingRef.current) {
        try { recog.start() } catch { /* already started / will retry */ }
      }
    }

    try {
      recog.start()
    } catch {
      // A start() while already running throws — safe to ignore.
    }

    return () => {
      isRecordingRef.current = false
      try { recog.stop() } catch { /* ignore */ }
    }
  }, [deviceId])

  function handleEnd() {
    if (confirming) {
      isRecordingRef.current = false
      try { (recognitionRef.current as any)?.stop() } catch { /* ignore */ }
      onEnd(transcriptRef.current || transcriptDisplay, elapsed)
    } else {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 4000)
    }
  }

  return (
    <div className="max-w-xl">
      {/* Recording header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className={cn('w-3 h-3 rounded-full', streamReady && !fatalMicError ? 'bg-destructive animate-pulse' : 'bg-muted-foreground')} />
          <span className="text-sm font-bold text-destructive uppercase tracking-wide">
            {fatalMicError ? 'Micrófono detenido' : streamReady ? 'Grabando' : 'Conectando…'}
          </span>
        </div>
        {/* Live mic level meter */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mic className={cn('w-3.5 h-3.5', silent ? 'text-warning' : streamReady ? 'text-success' : 'text-muted-foreground')} />
          <div className="flex items-end gap-0.5 h-4" aria-hidden="true">
            {[0, 1, 2, 3, 4].map(i => {
              const on = micLevel * 5 > i
              return (
                <span
                  key={i}
                  className={cn('w-1 rounded-sm transition-all', on ? 'bg-success' : 'bg-muted')}
                  style={{ height: `${4 + i * 3}px` }}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Patient */}
      <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 mb-6">
        <User className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-foreground/80 font-medium">{patientFullName(patient)}</span>
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center bg-[#0D1B2E] rounded-2xl px-10 py-5">
          <span className="text-5xl font-mono font-bold text-white tracking-widest">
            {fmtDuration(elapsed)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Duración de la sesión</p>
      </div>

      {/* No-audio warning */}
      {silent && !fatalMicError && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-warning/80">
            No se detecta audio del micrófono. Acerca el micrófono, sube el volumen de entrada o verifica que no esté silenciado.
          </p>
        </div>
      )}

      {/* Live transcript */}
      <div className="bg-muted/50 border border-border rounded-xl p-4 mb-6 min-h-[130px] max-h-[220px] overflow-y-auto">
        <div className="flex items-center gap-1.5 mb-2">
          <FileText className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transcripción en tiempo real</span>
        </div>
        {transcriptDisplay ? (
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{transcriptDisplay}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Comienza a hablar — la transcripción aparecerá aquí...
          </p>
        )}
      </div>

      {/* Error */}
      {micError && (
        <div className="bg-destructive/10 border border-destructive/15 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">{micError}</p>
        </div>
      )}

      {/* End button */}
      <button
        onClick={handleEnd}
        className={cn(
          'w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-xl transition-all text-sm',
          confirming
            ? 'bg-destructive hover:bg-destructive text-white ring-4 ring-destructive/15'
            : 'bg-destructive hover:bg-destructive text-white'
        )}
      >
        <Square className="w-4 h-4 fill-current" />
        {confirming ? '¿Confirmar finalización? Toca de nuevo' : 'Acabar sesión'}
      </button>

      {elapsed < 30 && (
        <p className="text-xs text-center text-muted-foreground mt-3">
          Sesión en curso — finaliza cuando el médico haya concluido la consulta
        </p>
      )}
    </div>
  )
}

// ── Step 5: Processing ────────────────────────────────────────────────────────

function ProcessingStep() {
  const messages = [
    'Procesando transcripción...',
    'Extrayendo información clínica con IA...',
    'Generando resumen médico...',
    'Preparando nota clínica...',
  ]
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 2200)
    return () => clearInterval(t)
  }, [messages.length])

  return (
    <div className="max-w-sm text-center py-12">
      <div className="w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-5">
        <Brain className="w-8 h-8 text-primary animate-pulse" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">Analizando consulta</h2>
      <p className="text-sm text-muted-foreground mb-6 transition-all">{messages[msgIdx]}</p>
      <div className="flex justify-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Step 6: Done ──────────────────────────────────────────────────────────────

function DoneStep({
  result,
  patient,
  onReset,
}: {
  result: ProcessResult
  patient: SelectedPatient
  onReset: () => void
}) {
  const router = useRouter()
  const { extracted, note } = result
  const duration = note.transcriptDurationSeconds ?? 0

  const fields: { label: string; value: string | null | undefined }[] = [
    { label: 'Motivo de consulta', value: extracted.chiefComplaint },
    { label: 'Padecimiento actual', value: extracted.evolutionNotes },
    { label: 'Exploración física', value: extracted.physicalExam },
    { label: 'Plan y tratamiento', value: extracted.treatmentPlan },
  ]

  return (
    <div className="max-w-xl">
      {/* Header success */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 bg-success/15 rounded-full flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6 text-success" />
        </div>
        <div>
          <p className="text-base font-bold text-foreground">Consulta procesada</p>
          <p className="text-sm text-muted-foreground">
            {patientFullName(patient)} · {fmtDuration(duration)} min
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1 text-xs bg-primary/15 text-primary px-2 py-1 rounded-full font-medium">
          <Brain className="w-3 h-3" />
          IA
        </span>
      </div>

      {/* Extracted fields */}
      {fields.some(f => f.value) && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campos extraídos por IA</p>
          {fields.map(f => f.value && (
            <div key={f.label}>
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">{f.label}</p>
              <p className="text-sm text-foreground leading-relaxed">{f.value}</p>
            </div>
          ))}
          {(extracted.diagnoses ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Diagnósticos</p>
              <div className="flex flex-wrap gap-1.5">
                {extracted.diagnoses!.map((d, i) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Summary */}
      {extracted.aiSummary && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-bold text-primary uppercase tracking-wide">Resumen IA</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{extracted.aiSummary}</p>
        </div>
      )}

      {/* Notice */}
      <div className="bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 mb-5 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-warning/80">
          La nota quedó guardada como <strong>borrador</strong>. Revisa y edita los campos antes de firmarla desde el expediente del paciente.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => router.push(`/pacientes/${result.patientId}`)}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          Ver expediente del paciente
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 border border-border hover:bg-muted/50 text-foreground/80 font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Nueva consulta
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ConsultaIaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPatientId = searchParams.get('patientId')

  const [step, setStep] = useState<Step>('patient')
  const [patient, setPatient] = useState<SelectedPatient | null>(null)
  const [consentAt, setConsentAt] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState('')
  // null = checking (avoids SSR/hydration flash), true/false once mounted
  const [browserSupported, setBrowserSupported] = useState<boolean | null>(null)

  useEffect(() => {
    setBrowserSupported(speechRecognitionSupported())
  }, [])

  // When launched from a patient page, pre-load the patient and skip to consent
  useEffect(() => {
    if (!initialPatientId) return
    api.patients.get(initialPatientId)
      .then((res: any) => {
        const p = res?.data ?? res
        if (p?.id) { setPatient(p); setStep('consent') }
      })
      .catch(() => {})
  }, [initialPatientId])

  function reset() {
    if (initialPatientId) {
      router.push(`/pacientes/${initialPatientId}`)
      return
    }
    setStep('patient')
    setPatient(null)
    setConsentAt(null)
    setDeviceId('')
    setResult(null)
    setError('')
  }

  async function handleRecordingEnd(transcript: string, durationSeconds: number) {
    if (!patient || !consentAt) return
    setStep('processing')
    setError('')
    try {
      const res = await api.consultaIa.process({
        patientId: patient.id,
        transcriptText: transcript || '(Sin transcript — la transcripción no pudo capturarse)',
        durationSeconds,
        consentAt,
      }) as { data: ProcessResult }
      setResult(res.data)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la consulta')
      setStep('recording')
    }
  }

  const subtitle =
    step === 'patient'    ? 'Paso 1 de 4 — Seleccionar paciente' :
    step === 'consent'    ? 'Paso 2 de 4 — Consentimiento' :
    step === 'microphone' ? 'Paso 3 de 4 — Micrófono' :
    step === 'recording'  ? `Consulta en curso — ${patient ? patientFullName(patient) : ''}` :
    step === 'processing' ? 'Procesando con IA...' :
                            'Consulta finalizada'

  return (
    <>
      <Header
        title="Consulta con IA"
        subtitle={subtitle}
      />

      <div className="flex-1 p-3 sm:p-6 overflow-auto">
        <div className="max-w-3xl">
          {browserSupported === false ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-lg mx-auto mt-8">
              <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-7 h-7 text-warning" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Disponible solo en Google Chrome
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                La Consulta con IA usa la transcripción de voz del navegador, que por ahora
                solo funciona de forma confiable en Google Chrome (también en Microsoft Edge).
                Tu navegador actual no es compatible.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Abre <span className="font-medium text-foreground">mediaclinic.mx</span> en
                Google Chrome para usar esta función.
              </p>
            </div>
          ) : (
          <>
          {error && (
            <div className="bg-destructive/10 border border-destructive/15 rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {step === 'patient' && (
            initialPatientId ? (
              <div className="py-16"><EcgLoader /></div>
            ) : (
              <PatientStep
                onSelect={p => { setPatient(p); setStep('consent') }}
              />
            )
          )}

          {step === 'consent' && patient && (
            <ConsentStep
              patient={patient}
              onConsent={ts => { setConsentAt(ts); setStep('microphone') }}
              onBack={() => initialPatientId ? router.push(`/pacientes/${initialPatientId}`) : setStep('patient')}
            />
          )}

          {step === 'microphone' && patient && (
            <MicrophoneStep
              patient={patient}
              onReady={id => { setDeviceId(id); setStep('recording') }}
              onBack={() => setStep('consent')}
            />
          )}

          {step === 'recording' && patient && (
            <RecordingStep
              patient={patient}
              deviceId={deviceId}
              onEnd={handleRecordingEnd}
            />
          )}

          {step === 'processing' && <ProcessingStep />}

          {step === 'done' && result && patient && (
            <DoneStep
              result={result}
              patient={patient}
              onReset={reset}
            />
          )}
          </>
          )}
        </div>
      </div>
    </>
  )
}

export default function ConsultaIaPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <EcgLoader />
      </div>
    }>
      <ConsultaIaContent />
    </Suspense>
  )
}
