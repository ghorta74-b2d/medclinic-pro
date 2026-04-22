'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { calculateAge, getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Search, Brain, Mic, MicOff, Square, CheckCircle2,
  User, Clock, ChevronRight, AlertCircle, Loader2,
  FileText, RotateCcw, ArrowRight, CheckSquare, Radio,
} from 'lucide-react'
import type { Patient } from 'medclinic-shared'

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
                done  ? 'bg-blue-600 text-white' :
                active ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                         'bg-gray-200 text-gray-500'
              )}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={cn('text-xs font-medium', active ? 'text-blue-700' : done ? 'text-blue-600' : 'text-gray-400')}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('w-8 h-px mx-2', i < idx ? 'bg-blue-400' : 'bg-gray-200')} />
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

      <h2 className="text-lg font-semibold text-gray-900 mb-1">Seleccionar paciente</h2>
      <p className="text-sm text-gray-500 mb-5">Busca al paciente para iniciar la consulta asistida.</p>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o CURP..."
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />}
      </div>

      {/* Results */}
      {results.length > 0 && !selected && (
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-sm">
          {results.map(p => (
            <button
              key={p.id}
              onClick={() => { setSelected(p); setQuery(patientFullName(p)); setResults([]) }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-0"
            >
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                {getInitials(p.firstName, p.lastName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{patientFullName(p)}</p>
                <p className="text-xs text-gray-400">
                  {p.dateOfBirth ? `${calculateAge(p.dateOfBirth)} años` : ''}
                  {p.gender === 'MALE' ? ' · Masculino' : p.gender === 'FEMALE' ? ' · Femenino' : ''}
                  {p.phone ? ` · ${p.phone}` : ''}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Selected patient card */}
      {selected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
              {getInitials(selected.firstName, selected.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{patientFullName(selected)}</p>
              <p className="text-xs text-gray-500">
                {selected.dateOfBirth ? `${calculateAge(selected.dateOfBirth)} años` : ''}
                {selected.gender === 'MALE' ? ' · Masculino' : selected.gender === 'FEMALE' ? ' · Femenino' : ''}
              </p>
              {selected.curp && (
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selected.curp}</p>
              )}
            </div>
            <button
              onClick={() => { setSelected(null); setQuery('') }}
              className="text-xs text-blue-600 hover:text-blue-800 shrink-0 font-medium"
            >
              Cambiar
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
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

      <h2 className="text-lg font-semibold text-gray-900 mb-1">Consentimiento del paciente</h2>
      <p className="text-sm text-gray-500 mb-5">
        Este paso es requerido por regulación antes de iniciar la grabación de la consulta.
      </p>

      {/* Patient reminder */}
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-5">
        <User className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-700 font-medium">{patientFullName(patient)}</span>
      </div>

      {/* Consent checkbox */}
      <label className={cn(
        'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors mb-6',
        checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
      )}>
        <div className={cn(
          'w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border-2 transition-colors',
          checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
        )}>
          {checked && <CheckSquare className="w-3.5 h-3.5 text-white" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-1">Consentimiento de grabación</p>
          <p className="text-sm text-gray-600 leading-relaxed">
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
          className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Regresar
        </button>
        <button
          onClick={() => checked && onConsent(new Date().toISOString())}
          disabled={!checked}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
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
  const [srSupported, setSrSupported] = useState(true)

  useEffect(() => {
    setSrSupported(
      typeof window !== 'undefined' &&
      !!(
        (window as Window & typeof globalThis & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
        (window as Window & typeof globalThis & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
      )
    )

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => navigator.mediaDevices.enumerateDevices())
      .then(all => {
        const inputs = all.filter(d => d.kind === 'audioinput')
        setDevices(inputs)
        if (inputs.length > 0) setSelected(inputs[0]!.deviceId)
        setLoading(false)
      })
      .catch(() => {
        setError('No se pudo acceder al micrófono. Verifica los permisos en tu navegador y vuelve a intentarlo.')
        setLoading(false)
      })
  }, [])

  return (
    <div className="max-w-xl">
      <StepIndicator current="microphone" />

      <h2 className="text-lg font-semibold text-gray-900 mb-1">Selección de micrófono</h2>
      <p className="text-sm text-gray-500 mb-5">Elige el micrófono que usarás durante la consulta.</p>

      {/* Patient reminder */}
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-5">
        <User className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-700 font-medium">{patientFullName(patient)}</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-sm text-gray-500 py-8">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          Detectando micrófonos disponibles...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 mb-1">Sin acceso al micrófono</p>
              <p className="text-sm text-red-700">{error}</p>
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
                selected === d.deviceId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                selected === d.deviceId ? 'border-blue-600' : 'border-gray-300'
              )}>
                {selected === d.deviceId && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
              </div>
              <Mic className={cn('w-4 h-4 shrink-0', selected === d.deviceId ? 'text-blue-600' : 'text-gray-400')} />
              <span className="text-sm font-medium text-gray-800 truncate">
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

      {!srSupported && !error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Tu navegador no soporta transcripción en tiempo real. Se grabará el audio pero no habrá preview del texto durante la consulta. Usa Chrome o Edge para la mejor experiencia.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Regresar
        </button>
        <button
          onClick={() => !error && selected && onReady(selected)}
          disabled={!!error || !selected || loading}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
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
  const [confirming, setConfirming] = useState(false)

  const transcriptRef = useRef('')
  const isRecordingRef = useRef(true)
  const recognitionRef = useRef<unknown>(null)

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Speech recognition
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recog = new SR() as any
    recog.lang = 'es-MX'
    recog.continuous = true
    recog.interimResults = true
    recognitionRef.current = recog

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    recog.onerror = () => {
      setMicError('Error de micrófono durante la grabación.')
    }

    recog.onend = () => {
      if (isRecordingRef.current) {
        try { recog.start() } catch { /* ignore */ }
      }
    }

    try {
      recog.start()
    } catch {
      setMicError('No se pudo iniciar el reconocimiento de voz.')
    }

    return () => {
      isRecordingRef.current = false
      try { recog.stop() } catch { /* ignore */ }
    }
  }, [deviceId])

  function handleEnd() {
    if (confirming) {
      isRecordingRef.current = false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-bold text-red-600 uppercase tracking-wide">Grabando</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Mic className="w-3.5 h-3.5" />
          <span className="truncate max-w-[180px]">Micrófono activo</span>
        </div>
      </div>

      {/* Patient */}
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-6">
        <User className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-700 font-medium">{patientFullName(patient)}</span>
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center bg-[#0D1B2E] rounded-2xl px-10 py-5">
          <span className="text-5xl font-mono font-bold text-white tracking-widest">
            {fmtDuration(elapsed)}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Duración de la sesión</p>
      </div>

      {/* Live transcript */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 min-h-[130px] max-h-[220px] overflow-y-auto">
        <div className="flex items-center gap-1.5 mb-2">
          <FileText className="w-3 h-3 text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Transcripción en tiempo real</span>
        </div>
        {transcriptDisplay ? (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{transcriptDisplay}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">
            {micError || 'Comienza a hablar — la transcripción aparecerá aquí...'}
          </p>
        )}
      </div>

      {/* Error */}
      {micError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700">{micError}</p>
        </div>
      )}

      {/* End button */}
      <button
        onClick={handleEnd}
        className={cn(
          'w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-xl transition-all text-sm',
          confirming
            ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-200'
            : 'bg-red-500 hover:bg-red-600 text-white'
        )}
      >
        <Square className="w-4 h-4 fill-current" />
        {confirming ? '¿Confirmar finalización? Toca de nuevo' : 'Acabar sesión'}
      </button>

      {elapsed < 30 && (
        <p className="text-xs text-center text-gray-400 mt-3">
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
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <Brain className="w-8 h-8 text-blue-600 animate-pulse" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Analizando consulta</h2>
      <p className="text-sm text-gray-500 mb-6 transition-all">{messages[msgIdx]}</p>
      <div className="flex justify-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
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
        <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <p className="text-base font-bold text-gray-900">Consulta procesada</p>
          <p className="text-sm text-gray-500">
            {patientFullName(patient)} · {fmtDuration(duration)} min
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
          <Brain className="w-3 h-3" />
          IA
        </span>
      </div>

      {/* Extracted fields */}
      {fields.some(f => f.value) && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Campos extraídos por IA</p>
          {fields.map(f => f.value && (
            <div key={f.label}>
              <p className="text-xs font-semibold text-gray-500 mb-0.5">{f.label}</p>
              <p className="text-sm text-gray-800 leading-relaxed">{f.value}</p>
            </div>
          ))}
          {(extracted.diagnoses ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Diagnósticos</p>
              <div className="flex flex-wrap gap-1.5">
                {extracted.diagnoses!.map((d, i) => (
                  <span key={i} className="text-xs bg-[#4E2DD2]/10 text-[#4E2DD2] px-2 py-0.5 rounded font-medium">
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
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain className="w-3.5 h-3.5 text-blue-600" />
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Resumen IA</p>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{extracted.aiSummary}</p>
        </div>
      )}

      {/* Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          La nota quedó guardada como <strong>borrador</strong>. Revisa y edita los campos antes de firmarla desde el expediente del paciente.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => router.push(`/pacientes/${result.patientId}`)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          Ver expediente del paciente
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Nueva consulta
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ConsultaIaPage() {
  const [step, setStep] = useState<Step>('patient')
  const [patient, setPatient] = useState<SelectedPatient | null>(null)
  const [consentAt, setConsentAt] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState('')

  function reset() {
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

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {step === 'patient' && (
            <PatientStep
              onSelect={p => { setPatient(p); setStep('consent') }}
            />
          )}

          {step === 'consent' && patient && (
            <ConsentStep
              patient={patient}
              onConsent={ts => { setConsentAt(ts); setStep('microphone') }}
              onBack={() => setStep('patient')}
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
        </div>
      </div>
    </>
  )
}
