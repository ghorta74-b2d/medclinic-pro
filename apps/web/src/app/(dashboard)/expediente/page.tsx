'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate, formatDateTime, getInitials, calculateAge } from '@/lib/utils'
import {
  CheckCircle, ClipboardList, Loader2, Plus, Clock,
  AlertTriangle, Save
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { searchCie10 } from 'medclinic-shared'
import type { Patient, ClinicalNote } from 'medclinic-shared'

const NOTE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-warning/15 text-warning',
  SIGNED: 'bg-success/15 text-success',
  AMENDED: 'bg-primary/15 text-primary',
}
const NOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SIGNED: 'Firmada',
  AMENDED: 'Enmendada',
}

type NoteWithRelations = ClinicalNote

const EMPTY_VITALS = { weight: '', height: '', bpSystolic: '', bpDiastolic: '', heartRate: '', temperature: '', oxygenSaturation: '' }

function ExpedientePageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const patientId = searchParams.get('patientId')
  const noteId = searchParams.get('noteId')

  const [patient, setPatient] = useState<Patient | null>(null)
  const [notes, setNotes] = useState<NoteWithRelations[]>([])
  const [activeNote, setActiveNote] = useState<NoteWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [signing, setSigning] = useState(false)
  const [diagQuery, setDiagQuery] = useState('')
  const [diagResults, setDiagResults] = useState<{ code: string; description: string }[]>([])

  const [chiefComplaint, setChiefComplaint] = useState('')
  const [physicalExam, setPhysicalExam] = useState('')
  const [treatmentPlan, setTreatmentPlan] = useState('')
  const [evolutionNotes, setEvolutionNotes] = useState('')
  const [diagnoses, setDiagnoses] = useState<{ code: string; description: string; type: string }[]>([])
  const [vitals, setVitals] = useState(EMPTY_VITALS)

  const load = useCallback(async () => {
    if (!patientId) { setLoading(false); return }
    setLoading(true)
    try {
      const [patRes, notesRes] = await Promise.all([
        api.patients.get(patientId) as Promise<{ data: Patient }>,
        api.clinicalNotes.list(patientId) as Promise<{ data: NoteWithRelations[] }>,
      ])
      setPatient(patRes.data)
      const sorted = notesRes.data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setNotes(sorted)
      const targetId = noteId ?? sorted.find(n => n.status === 'DRAFT')?.id
      if (targetId) {
        const nr = await api.clinicalNotes.get(targetId) as { data: NoteWithRelations }
        loadNoteIntoForm(nr.data)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [patientId, noteId])

  function loadNoteIntoForm(note: NoteWithRelations) {
    setActiveNote(note)
    setChiefComplaint(note.chiefComplaint ?? '')
    setPhysicalExam(note.physicalExam ?? '')
    setTreatmentPlan(note.treatmentPlan ?? '')
    setEvolutionNotes(note.evolutionNotes ?? '')
    setDiagnoses(note.diagnoses ?? [])
    const vs = note.vitalSigns
    setVitals(vs ? {
      weight: vs.weightKg?.toString() ?? '',
      height: vs.heightCm?.toString() ?? '',
      bpSystolic: vs.systolicBp?.toString() ?? '',
      bpDiastolic: vs.diastolicBp?.toString() ?? '',
      heartRate: vs.heartRateBpm?.toString() ?? '',
      temperature: vs.temperatureC?.toString() ?? '',
      oxygenSaturation: vs.spo2Percent?.toString() ?? '',
    } : EMPTY_VITALS)
  }

  function clearForm() {
    setActiveNote(null)
    setChiefComplaint(''); setPhysicalExam(''); setTreatmentPlan('')
    setEvolutionNotes(''); setDiagnoses([]); setVitals(EMPTY_VITALS)
  }

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (diagQuery.length >= 2) setDiagResults(searchCie10(diagQuery).slice(0, 8))
    else setDiagResults([])
  }, [diagQuery])

  const bmi = vitals.weight && vitals.height
    ? (parseFloat(vitals.weight) / Math.pow(parseFloat(vitals.height) / 100, 2)).toFixed(1)
    : null

  async function handleSave() {
    if (!patientId) return
    setSaving(true)
    try {
      const payload = {
        patientId, chiefComplaint, physicalExam, treatmentPlan, evolutionNotes, diagnoses,
        vitalSigns: vitals.weight ? {
          weightKg: parseFloat(vitals.weight) || undefined,
          heightCm: parseFloat(vitals.height) || undefined,
          systolicBp: parseInt(vitals.bpSystolic) || undefined,
          diastolicBp: parseInt(vitals.bpDiastolic) || undefined,
          heartRateBpm: parseInt(vitals.heartRate) || undefined,
          temperatureC: parseFloat(vitals.temperature) || undefined,
          spo2Percent: parseFloat(vitals.oxygenSaturation) || undefined,
        } : undefined,
      }
      if (activeNote?.id) {
        const res = await api.clinicalNotes.update(activeNote.id, payload) as { data: NoteWithRelations }
        setActiveNote(res.data)
      } else {
        const res = await api.clinicalNotes.create(payload) as { data: NoteWithRelations }
        setActiveNote(res.data)
        load()
      }
      alert('Nota guardada exitosamente')
    } catch (err) { alert(err instanceof Error ? err.message : 'Error al guardar') }
    finally { setSaving(false) }
  }

  async function handleSign() {
    if (!activeNote?.id) return
    if (!confirm('¿Firmar electrónicamente esta nota? No podrá editarse después (NOM-004).')) return
    setSigning(true)
    try {
      await api.clinicalNotes.sign(activeNote.id)
      alert('Nota firmada exitosamente')
      load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Error al firmar') }
    finally { setSigning(false) }
  }

  const isSigned = activeNote?.status === 'SIGNED'

  if (!patientId) {
    return (
      <>
        <Header title="Expediente Clínico" subtitle="Selecciona un paciente para comenzar" />
        <div className="flex-1 p-6">
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/60 mb-4" />
            <h3 className="text-foreground/80 font-medium mb-2">Sin paciente seleccionado</h3>
            <p className="text-sm text-muted-foreground mb-6">Ve a la lista de pacientes y abre su expediente desde ahí.</p>
            <button onClick={() => router.push('/pacientes')}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              Ir a Pacientes
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title="Expediente Clínico"
        subtitle={patient ? `${patient.firstName} ${patient.lastName}` : 'Cargando...'}
        actions={
          !isSigned ? (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-card border border-border text-foreground/80 text-sm font-medium px-4 py-2 rounded-lg hover:bg-muted/50 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
              <button onClick={handleSign} disabled={signing || !activeNote?.id}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
                {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Finalizar
              </button>
            </div>
          ) : (
            <span className="text-sm bg-success/15 text-success px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Firmada NOM-004
            </span>
          )
        }
      />

      <div className="flex-1 overflow-hidden flex">
        {/* History sidebar */}
        <aside className="w-56 bg-card border-r border-border flex flex-col shrink-0">
          <div className="px-3 py-3 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial</p>
            <button onClick={clearForm} className="p-1 hover:bg-muted rounded">
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-border/50">
              {notes.map((note) => (
                <button key={note.id} onClick={() => loadNoteIntoForm(note)}
                  className={cn('w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors',
                    activeNote?.id === note.id && 'bg-primary/10 border-l-2 border-primary')}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium',
                      NOTE_STATUS_COLORS[note.status] ?? 'bg-muted text-muted-foreground')}>
                      {NOTE_STATUS_LABELS[note.status] ?? note.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground/80 truncate">{note.chiefComplaint || 'Sin motivo'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{formatDate(note.createdAt, 'd MMM yyyy')}
                  </p>
                </button>
              ))}
              {notes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Sin consultas previas</p>
              )}
            </div>
          )}
        </aside>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto flex">
          <div className="flex-1 p-5 space-y-5 max-w-3xl">
            {patient?.allergies && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-red-200 text-destructive px-4 py-2.5 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span><strong>Alergia:</strong> {patient.allergies}</span>
              </div>
            )}
            {isSigned && (
              <div className="flex items-center gap-2 bg-success/10 border border-green-200 text-success px-4 py-2.5 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Nota firmada el {activeNote?.signedAt ? formatDateTime(activeNote.signedAt) : '—'} (NOM-004-SSA3-2012)
              </div>
            )}

            {/* Vitals */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Signos vitales</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { key:'weight', label:'Peso (kg)', placeholder:'68' },
                  { key:'height', label:'Talla (cm)', placeholder:'162' },
                  { key:'bpSystolic', label:'TA sistólica', placeholder:'120' },
                  { key:'bpDiastolic', label:'TA diastólica', placeholder:'80' },
                  { key:'heartRate', label:'FC (lpm)', placeholder:'72' },
                  { key:'temperature', label:'Temp (°C)', placeholder:'36.5' },
                  { key:'oxygenSaturation', label:'SpO₂ (%)', placeholder:'98' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                    <input type="number"
                      value={vitals[key as keyof typeof vitals]}
                      onChange={(e) => setVitals(v => ({ ...v, [key]: e.target.value }))}
                      disabled={isSigned} placeholder={placeholder}
                      className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted/50 disabled:text-muted-foreground" />
                  </div>
                ))}
                {bmi && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">IMC (auto)</label>
                    <div className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-muted/50 text-muted-foreground font-medium">{bmi}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Motivo */}
            <div className="bg-card rounded-xl border border-border p-4">
              <label className="block text-sm font-semibold text-foreground mb-2">Motivo de consulta</label>
              <textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)}
                disabled={isSigned} placeholder="Escribir motivo de consulta..." rows={3}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:bg-muted/50 disabled:text-muted-foreground" />
            </div>

            {/* Exploración */}
            <div className="bg-card rounded-xl border border-border p-4">
              <label className="block text-sm font-semibold text-foreground mb-2">Exploración física</label>
              <textarea value={physicalExam} onChange={(e) => setPhysicalExam(e.target.value)}
                disabled={isSigned} placeholder="Escribir exploración física..." rows={4}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:bg-muted/50 disabled:text-muted-foreground" />
            </div>

            {/* Diagnóstico CIE-10 */}
            <div className="bg-card rounded-xl border border-border p-4">
              <label className="block text-sm font-semibold text-foreground mb-2">Diagnóstico (CIE-10)</label>
              <div className="space-y-2 mb-3">
                {diagnoses.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded font-mono shrink-0">{d.code}</span>
                    <span className="text-sm text-foreground/80 flex-1 truncate">{d.description}</span>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded shrink-0">{d.type}</span>
                    {!isSigned && (
                      <button onClick={() => setDiagnoses(diagnoses.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                    )}
                  </div>
                ))}
              </div>
              {!isSigned && (
                <div className="relative">
                  <input type="text" value={diagQuery} onChange={(e) => setDiagQuery(e.target.value)}
                    placeholder="Buscar diagnóstico CIE-10..."
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
                  {diagResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                      {diagResults.map((r) => (
                        <button key={r.code}
                          onClick={() => { setDiagnoses([...diagnoses, { ...r, type: 'PRIMARY' }]); setDiagQuery(''); setDiagResults([]) }}
                          className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-2">
                          <span className="text-xs font-mono text-primary shrink-0">{r.code}</span>
                          <span className="text-sm text-foreground/80 truncate">{r.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Plan */}
            <div className="bg-card rounded-xl border border-border p-4">
              <label className="block text-sm font-semibold text-foreground mb-2">Plan de tratamiento</label>
              <textarea value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)}
                disabled={isSigned} placeholder="Indicaciones, medicamentos, estudios..." rows={3}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:bg-muted/50 disabled:text-muted-foreground" />
            </div>

            {/* Evolución */}
            <div className="bg-card rounded-xl border border-border p-4">
              <label className="block text-sm font-semibold text-foreground mb-2">Notas de evolución</label>
              <textarea value={evolutionNotes} onChange={(e) => setEvolutionNotes(e.target.value)}
                disabled={isSigned} placeholder="Seguimiento, evolución del paciente..." rows={3}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:bg-muted/50 disabled:text-muted-foreground" />
            </div>
          </div>

          {/* Patient panel */}
          {patient && (
            <aside className="w-52 shrink-0 border-l border-border bg-card p-4 space-y-4 overflow-y-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center text-primary font-bold text-sm mx-auto mb-2">
                  {getInitials(patient.firstName, patient.lastName)}
                </div>
                <p className="text-sm font-semibold text-foreground">{patient.firstName} {patient.lastName}</p>
                <p className="text-xs text-muted-foreground">
                  {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} años` : '—'} · {patient.gender === 'FEMALE' ? 'Femenino' : patient.gender === 'MALE' ? 'Masculino' : '—'}
                </p>
              </div>
              {patient.allergies && (
                <div className="bg-destructive/10 border border-red-200 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Alergia
                  </p>
                  <p className="text-xs text-destructive">{patient.allergies}</p>
                </div>
              )}
              {patient.chronicConditions && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Padecimientos</p>
                  <p className="text-xs text-muted-foreground">{patient.chronicConditions}</p>
                </div>
              )}
              {activeNote && (
                <div className="border-t border-border pt-3 space-y-1.5 text-xs text-muted-foreground">
                  <p className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Auditoría</p>
                  <p><span className="font-medium">Creado:</span> {formatDate(activeNote.createdAt, 'd MMM yyyy')}</p>
                  {activeNote.signedAt && <p><span className="font-medium">Firmado:</span> {formatDate(activeNote.signedAt, 'd MMM yyyy')}</p>}
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </>
  )
}

export default function ExpedientePage() {
  return (
    <Suspense>
      <ExpedientePageInner />
    </Suspense>
  )
}
