'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api, getUserRole } from '@/lib/api'
import { formatDate, formatDateTime, getInitials, calculateAge, formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, Phone, Mail, Calendar, Droplets, AlertTriangle,
  FileText, Pill, FlaskConical, ChevronDown, ChevronUp, ChevronRight, Clock,
  Pencil, X, Check, Loader2, Printer, Plus, Stethoscope, UserCheck,
  Upload, Sparkles, ExternalLink, Brain, Download, PenLine, Search,
  AlertCircle, CheckCircle2,
} from 'lucide-react'
import type { Patient, ClinicalNote, Appointment, Prescription, LabResult, VitalSigns } from 'medclinic-shared'
import { GENDER_LABELS, BLOOD_TYPE_LABELS, STATUS_LABELS } from 'medclinic-shared'
import { cn } from '@/lib/utils'
import { PrescriptionBuilder } from '@/components/prescriptions/prescription-builder'
import { ClinicalNoteEditor } from '@/components/clinical-notes/note-editor'

// ── Phone helpers ──────────────────────────────────────────────────────────────
function extractPhone(phone: string): { prefix: string; digits: string } {
  if (phone.startsWith('+52')) return { prefix: '+52', digits: phone.slice(3) }
  if (phone.startsWith('52') && phone.length === 12) return { prefix: '+52', digits: phone.slice(2) }
  return { prefix: '+52', digits: phone.replace(/\D/g, '').slice(-10) }
}

// ── EditPatientModal ───────────────────────────────────────────────────────────
function EditPatientModal({
  patient,
  onClose,
  onSaved,
}: {
  patient: PatientWithCount
  onClose: () => void
  onSaved: (updated: PatientWithCount) => void
}) {
  const { digits: initDigits } = extractPhone(patient.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [phoneDigits, setPhoneDigits] = useState(initDigits)
  const [form, setForm] = useState({
    firstName:          patient.firstName,
    lastName:           patient.lastName,
    email:              patient.email ?? '',
    dateOfBirth:        patient.dateOfBirth ? patient.dateOfBirth.toString().slice(0, 10) : '',
    gender:             patient.gender ?? '',
    bloodType:          patient.bloodType ?? 'UNKNOWN',
    curp:               patient.curp ?? '',
    address:            patient.address ?? '',
    city:               patient.city ?? '',
    state:              patient.state ?? '',
    allergies:          patient.allergies.join(', '),
    chronicConditions:  patient.chronicConditions.join(', '),
    currentMedications: patient.currentMedications.join(', '),
    emergencyName:      patient.emergencyName ?? '',
    emergencyPhone:     patient.emergencyPhone ?? '',
    notes:              (patient as any).notes ?? '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (phoneDigits.length !== 10) {
      setError('El teléfono debe tener exactamente 10 dígitos')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await api.patients.update(patient.id, {
        firstName:          form.firstName.trim(),
        lastName:           form.lastName.trim(),
        phone:              `+52${phoneDigits}`,
        email:              form.email || undefined,
        dateOfBirth:        form.dateOfBirth ? (() => { const [y,m,d] = form.dateOfBirth.split('-').map(Number); return new Date(y!, m!-1, d!, 12).toISOString() })() : undefined,
        gender:             form.gender || undefined,
        bloodType:          form.bloodType || 'UNKNOWN',
        curp:               form.curp || undefined,
        address:            form.address || undefined,
        city:               form.city || undefined,
        state:              form.state || undefined,
        allergies:          form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        chronicConditions:  form.chronicConditions ? form.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        currentMedications: form.currentMedications ? form.currentMedications.split(',').map(s => s.trim()).filter(Boolean) : [],
        emergencyName:      form.emergencyName || undefined,
        emergencyPhone:     form.emergencyPhone || undefined,
        notes:              form.notes || undefined,
      }) as { data: PatientWithCount }
      onSaved(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary'
  const lbl = 'block text-xs font-medium text-muted-foreground mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-foreground">Editar paciente</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">Datos personales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Nombre(s) *</label><input required value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Apellidos *</label><input required value={form.lastName} onChange={e => set('lastName', e.target.value)} className={inp} /></div>
              <div>
                <label className={lbl}>WhatsApp *</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-border rounded-l-lg bg-muted/50 text-sm text-muted-foreground font-medium select-none">+52</span>
                  <input type="tel" inputMode="numeric" placeholder="5512345678" value={phoneDigits}
                    onChange={e => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10}
                    className="flex-1 px-3 py-2 border border-border rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                {phoneDigits.length > 0 && phoneDigits.length < 10 && (
                  <p className="text-xs text-amber-600 mt-0.5">{10 - phoneDigits.length} dígitos restantes</p>
                )}
              </div>
              <div><label className={lbl}>Correo electrónico</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Fecha de nacimiento</label><input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={inp} /></div>
              <div>
                <label className={lbl}>Sexo</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inp}>
                  <option value="">Sin especificar</option>
                  <option value="FEMALE">Femenino</option>
                  <option value="MALE">Masculino</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Grupo sanguíneo</label>
                <select value={form.bloodType} onChange={e => set('bloodType', e.target.value)} className={inp}>
                  {['UNKNOWN','A_POS','A_NEG','B_POS','B_NEG','AB_POS','AB_NEG','O_POS','O_NEG'].map(bt => (
                    <option key={bt} value={bt}>{bt === 'UNKNOWN' ? 'Desconocido' : bt.replace('_POS', '+').replace('_NEG', '-')}</option>
                  ))}
                </select>
              </div>
              <div><label className={lbl}>CURP</label><input maxLength={18} value={form.curp} onChange={e => set('curp', e.target.value.toUpperCase())} placeholder="18 caracteres" className={inp} /></div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">Domicilio</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className={lbl}>Dirección</label><input value={form.address} onChange={e => set('address', e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Ciudad</label><input value={form.city} onChange={e => set('city', e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Estado</label><input value={form.state} onChange={e => set('state', e.target.value)} className={inp} /></div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">Antecedentes médicos</h3>
            <div className="space-y-3">
              <div><label className={lbl}>Alergias <span className="font-normal text-muted-foreground/60">(separadas por comas)</span></label><input value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder="Penicilina, Sulfa..." className={inp} /></div>
              <div><label className={lbl}>Enfermedades crónicas <span className="font-normal text-muted-foreground/60">(separadas por comas)</span></label><input value={form.chronicConditions} onChange={e => set('chronicConditions', e.target.value)} placeholder="Diabetes, Hipertensión..." className={inp} /></div>
              <div><label className={lbl}>Medicamentos actuales <span className="font-normal text-muted-foreground/60">(separados por comas)</span></label><input value={form.currentMedications} onChange={e => set('currentMedications', e.target.value)} placeholder="Metformina 500mg, Losartán..." className={inp} /></div>
              <div><label className={lbl}>Notas internas</label><textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className={`${inp} resize-none`} placeholder="Observaciones del expediente..." /></div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">Contacto de emergencia</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Nombre</label><input value={form.emergencyName} onChange={e => set('emergencyName', e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Teléfono</label><input value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} className={inp} /></div>
            </div>
          </section>

          {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted/50">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── PatientProfileModal ────────────────────────────────────────────────────────
function PatientProfileModal({
  patient,
  onClose,
  onEdit,
}: {
  patient: PatientWithCount
  onClose: () => void
  onEdit: () => void
}) {
  const field = (label: string, value: string | null | undefined) =>
    value ? (
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm text-foreground font-medium">{value}</p>
      </div>
    ) : null

  const listField = (label: string, values: string[]) =>
    values.length > 0 ? (
      <div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="text-xs bg-muted text-foreground/80 px-2.5 py-1 rounded-full">{v}</span>
          ))}
        </div>
      </div>
    ) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-sm font-bold">
              {getInitials(patient.firstName, patient.lastName)}
            </div>
            <div>
              <p className="font-semibold text-foreground">{patient.firstName} {patient.lastName}</p>
              {patient.dateOfBirth && (
                <p className="text-xs text-muted-foreground">{calculateAge(patient.dateOfBirth)} años · {BLOOD_TYPE_LABELS[patient.bloodType]}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); onEdit() }}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Datos personales */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos personales</h3>
            <div className="grid grid-cols-2 gap-4">
              {field('Nombre', `${patient.firstName} ${patient.lastName}`)}
              {field('Fecha de nacimiento', patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null)}
              {field('Género', patient.gender ? GENDER_LABELS[patient.gender] : null)}
              {field('Tipo de sangre', BLOOD_TYPE_LABELS[patient.bloodType])}
              {field('CURP', patient.curp)}
              {field('RFC', (patient as any).rfc)}
            </div>
          </section>

          {/* Contacto */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contacto</h3>
            <div className="grid grid-cols-2 gap-4">
              {field('Teléfono', patient.phone)}
              {field('Correo electrónico', patient.email)}
              {field('Dirección', (patient as any).address)}
              {field('Ciudad', (patient as any).city)}
              {field('Estado', (patient as any).state)}
              {field('Código postal', (patient as any).zipCode)}
            </div>
          </section>

          {/* Historial médico */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Historial médico</h3>
            <div className="space-y-3">
              {listField('Alergias', patient.allergies)}
              {listField('Condiciones crónicas', patient.chronicConditions)}
              {listField('Medicamentos actuales', patient.currentMedications)}
              {listField('Antecedentes quirúrgicos', (patient as any).surgicalHistory ?? [])}
              {patient.allergies.length === 0 && patient.chronicConditions.length === 0 &&
               patient.currentMedications.length === 0 && ((patient as any).surgicalHistory ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground italic">Sin antecedentes registrados</p>
              )}
            </div>
          </section>

          {/* Contacto de emergencia */}
          {((patient as any).emergencyName || (patient as any).emergencyPhone) && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contacto de emergencia</h3>
              <div className="grid grid-cols-2 gap-4">
                {field('Nombre', (patient as any).emergencyName)}
                {field('Teléfono', (patient as any).emergencyPhone)}
                {field('Relación', (patient as any).emergencyRelation)}
              </div>
            </section>
          )}

          {/* Notas */}
          {(patient as any).notes && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Notas</h3>
              <p className="text-sm text-foreground/80 leading-relaxed bg-muted/50 rounded-xl p-3">
                {(patient as any).notes}
              </p>
            </section>
          )}

          {/* Audit */}
          {(patient as any).lastModifiedByName && (
            <p className="text-xs text-muted-foreground pb-2">
              Modificado por <span className="font-medium text-muted-foreground">{(patient as any).lastModifiedByName}</span>
              {(patient as any).lastModifiedAt && <> · {formatDateTime((patient as any).lastModifiedAt)}</>}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface PatientWithCount extends Patient {
  insurances: unknown[]
  _count: { appointments: number; clinicalNotes: number; prescriptions: number; labResults: number }
}

interface Timeline {
  appointments: Appointment[]
  notes: ClinicalNote[]
  prescriptions: Prescription[]
  labResults: LabResult[]
}

type Tab = 'consultas' | 'recetas' | 'lab'

// ── Vitals compact strip ───────────────────────────────────────────────────────
function VitalsStrip({ v }: { v: VitalSigns }) {
  const ok = (val: unknown) => val !== undefined && val !== null
  const items = [
    ok(v.weightKg)    ? `${v.weightKg} kg`                                : null,
    ok(v.heightCm)    ? `${v.heightCm} cm`                                : null,
    (ok(v.systolicBp) && ok(v.diastolicBp)) ? `${v.systolicBp}/${v.diastolicBp} mmHg` : null,
    ok(v.heartRateBpm) ? `${v.heartRateBpm} lpm`                          : null,
    ok(v.temperatureC) ? `${v.temperatureC} °C`                           : null,
    ok(v.spo2Percent)  ? `${v.spo2Percent}% SpO₂`                         : null,
    ok(v.glucoseMgDl)  ? `${v.glucoseMgDl} mg/dL`                         : null,
  ].filter(Boolean) as string[]

  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item) => (
        <span key={item} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">{item}</span>
      ))}
    </div>
  )
}

// ── Complementar types ─────────────────────────────────────────────────────────
interface ComplementarVitals {
  weightKg: string; heightCm: string; systolicBp: string; diastolicBp: string
  heartRateBpm: string; temperatureC: string; spo2Percent: string; glucoseMgDl: string
}

interface Cie10Result { code: string; description: string; chapter?: string; block?: string }
interface DiagItem { code: string; description: string; type: 'PRIMARY' | 'SECONDARY' | 'RULE_OUT' }

// ── ComplementarPanel ──────────────────────────────────────────────────────────
function ComplementarPanel({ note, onSaved, onClose }: {
  note: AiNote
  onSaved: () => void
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const initVitals = (): ComplementarVitals => ({
    weightKg:     note.vitalSigns?.weightKg    != null ? String(note.vitalSigns.weightKg)    : '',
    heightCm:     note.vitalSigns?.heightCm    != null ? String(note.vitalSigns.heightCm)    : '',
    systolicBp:   note.vitalSigns?.systolicBp  != null ? String(note.vitalSigns.systolicBp)  : '',
    diastolicBp:  note.vitalSigns?.diastolicBp != null ? String(note.vitalSigns.diastolicBp) : '',
    heartRateBpm: note.vitalSigns?.heartRateBpm != null ? String(note.vitalSigns.heartRateBpm) : '',
    temperatureC: note.vitalSigns?.temperatureC != null ? String(note.vitalSigns.temperatureC) : '',
    spo2Percent:  note.vitalSigns?.spo2Percent  != null ? String(note.vitalSigns.spo2Percent)  : '',
    glucoseMgDl:  note.vitalSigns?.glucoseMgDl  != null ? String(note.vitalSigns.glucoseMgDl)  : '',
  })

  const [vitals, setVitals] = useState<ComplementarVitals>(initVitals)
  const [diagnoses, setDiagnoses] = useState<DiagItem[]>(
    Array.isArray(note.diagnoses) ? (note.diagnoses as DiagItem[]) : []
  )
  const [treatmentPlan, setTreatmentPlan] = useState(note.treatmentPlan ?? '')
  const [evolutionNotes, setEvolutionNotes] = useState(note.evolutionNotes ?? '')

  const [diagSearch, setDiagSearch] = useState('')
  const [diagResults, setDiagResults] = useState<Cie10Result[]>([])
  const [diagSearching, setDiagSearching] = useState(false)
  const diagDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [missingSections, setMissingSections] = useState<string[]>([])
  const [error, setError] = useState('')

  function toggleSection(id: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleDiagSearch(q: string) {
    setDiagSearch(q)
    if (diagDebounceRef.current) clearTimeout(diagDebounceRef.current)
    if (q.length < 2) { setDiagResults([]); setDiagSearching(false); return }
    setDiagSearching(true)
    diagDebounceRef.current = setTimeout(async () => {
      try {
        const res = await api.catalogs.cie10(q) as { data: Cie10Result[] }
        setDiagResults(res.data ?? [])
      } catch { setDiagResults([]) }
      finally { setDiagSearching(false) }
    }, 300)
  }

  function addDiagnosis(entry: Cie10Result) {
    if (diagnoses.some(d => d.code === entry.code)) return
    const type: DiagItem['type'] = diagnoses.length === 0 ? 'PRIMARY' : 'SECONDARY'
    setDiagnoses([...diagnoses, { code: entry.code, description: entry.description, type }])
    setDiagSearch('')
    setDiagResults([])
  }

  function buildPayload() {
    const hasVitals = Object.values(vitals).some(x => x !== '')
    return {
      diagnoses,
      treatmentPlan: treatmentPlan || undefined,
      evolutionNotes: evolutionNotes || undefined,
      vitalSigns: hasVitals ? {
        weightKg:     vitals.weightKg     ? parseFloat(vitals.weightKg)     : undefined,
        heightCm:     vitals.heightCm     ? parseFloat(vitals.heightCm)     : undefined,
        systolicBp:   vitals.systolicBp   ? parseInt(vitals.systolicBp)     : undefined,
        diastolicBp:  vitals.diastolicBp  ? parseInt(vitals.diastolicBp)    : undefined,
        heartRateBpm: vitals.heartRateBpm ? parseInt(vitals.heartRateBpm)   : undefined,
        temperatureC: vitals.temperatureC ? parseFloat(vitals.temperatureC) : undefined,
        spo2Percent:  vitals.spo2Percent  ? parseInt(vitals.spo2Percent)    : undefined,
        glucoseMgDl:  vitals.glucoseMgDl  ? parseInt(vitals.glucoseMgDl)    : undefined,
      } : undefined,
    }
  }

  async function handleSaveDraft() {
    setIsSaving(true)
    setError('')
    try {
      await api.clinicalNotes.update(note.id, buildPayload())
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  function handleSign() {
    const missing: string[] = []
    if (!Object.values(vitals).some(x => x !== '') && !note.vitalSigns) missing.push('Signos vitales')
    if (diagnoses.length === 0) missing.push('Diagnóstico CIE-10')
    if (!treatmentPlan.trim()) missing.push('Plan de tratamiento')
    if (!evolutionNotes.trim()) missing.push('Notas de evolución')
    if (missing.length > 0) {
      setMissingSections(missing)
      setShowSignModal(true)
      return
    }
    executeSign()
  }

  async function executeSign() {
    setShowSignModal(false)
    setIsSigning(true)
    setError('')
    try {
      await api.clinicalNotes.update(note.id, buildPayload())
      await api.clinicalNotes.sign(note.id)
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al firmar')
    } finally {
      setIsSigning(false)
    }
  }

  const inp = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary'
  const lbl = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1'

  function AccordionHeader({ id, label }: { id: string; label: string }) {
    const isOpen = openSections.has(id)
    return (
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {isOpen
          ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </button>
    )
  }

  return (
    <div ref={panelRef} className="border-t-2 border-success/50 bg-success/5">
      <div className="px-4 py-3 flex items-center justify-between border-b border-success/30 bg-success/10">
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-success" />
          <span className="text-sm font-semibold text-success">Complementar consulta</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-success/15 rounded text-success/70 hover:text-success">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-border/50">
        {/* ── Signos vitales ── */}
        <div>
          <AccordionHeader id="vitals" label="Signos vitales" />
          {openSections.has('vitals') && (
            <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'weightKg',     label: 'Peso (kg)',        placeholder: '65.5' },
                { key: 'heightCm',     label: 'Talla (cm)',       placeholder: '165'  },
                { key: 'systolicBp',   label: 'TA sistólica',     placeholder: '120'  },
                { key: 'diastolicBp',  label: 'TA diastólica',    placeholder: '80'   },
                { key: 'heartRateBpm', label: 'FC (lpm)',         placeholder: '72'   },
                { key: 'temperatureC', label: 'Temperatura (°C)', placeholder: '36.5' },
                { key: 'spo2Percent',  label: 'SpO₂ (%)',        placeholder: '98'   },
                { key: 'glucoseMgDl',  label: 'Glucosa (mg/dL)', placeholder: '95'   },
              ].map(f => (
                <div key={f.key}>
                  <label className={lbl}>{f.label}</label>
                  <input
                    type="number"
                    step="any"
                    placeholder={f.placeholder}
                    value={vitals[f.key as keyof ComplementarVitals]}
                    onChange={e => setVitals(v => ({ ...v, [f.key]: e.target.value }))}
                    className={inp}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Diagnóstico CIE-10 ── */}
        <div>
          <AccordionHeader id="diagnoses" label="Diagnóstico CIE-10" />
          {openSections.has('diagnoses') && (
            <div className="px-4 pb-4 space-y-3">
              {diagnoses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {diagnoses.map(d => (
                    <div key={d.code} className="flex items-center gap-2 bg-primary/10 border border-primary rounded-lg px-3 py-1.5">
                      <span className="text-xs font-bold text-primary">{d.code}</span>
                      <span className="text-xs text-primary">{d.description}</span>
                      <select
                        value={d.type}
                        onChange={e => setDiagnoses(diagnoses.map(x =>
                          x.code === d.code ? { ...x, type: e.target.value as DiagItem['type'] } : x
                        ))}
                        className="text-xs border-none bg-transparent text-primary outline-none cursor-pointer"
                      >
                        <option value="PRIMARY">Principal</option>
                        <option value="SECONDARY">Secundario</option>
                        <option value="RULE_OUT">A descartar</option>
                      </select>
                      <button onClick={() => setDiagnoses(diagnoses.filter(x => x.code !== d.code))} className="text-primary hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                {diagSearching
                  ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                  : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                }
                <input
                  type="text"
                  placeholder="Buscar código CIE-10 o descripción..."
                  value={diagSearch}
                  onChange={e => handleDiagSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {diagResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg z-10 max-h-48 overflow-y-auto">
                    {diagResults.map(entry => (
                      <button
                        key={entry.code}
                        type="button"
                        onClick={() => addDiagnosis(entry)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-primary/10 flex items-center gap-3"
                      >
                        <span className="font-mono text-xs text-primary w-16 shrink-0">{entry.code}</span>
                        <span className="text-foreground">{entry.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Plan de tratamiento ── */}
        <div>
          <AccordionHeader id="plan" label="Plan de tratamiento" />
          {openSections.has('plan') && (
            <div className="px-4 pb-4">
              <textarea
                rows={4}
                value={treatmentPlan}
                onChange={e => setTreatmentPlan(e.target.value)}
                placeholder="Indicaciones, estudios solicitados, interconsultas..."
                className={inp}
              />
            </div>
          )}
        </div>

        {/* ── Notas de evolución ── */}
        <div>
          <AccordionHeader id="evolution" label="Notas de evolución" />
          {openSections.has('evolution') && (
            <div className="px-4 pb-4">
              <textarea
                rows={3}
                value={evolutionNotes}
                onChange={e => setEvolutionNotes(e.target.value)}
                placeholder="Evolución del padecimiento, respuesta al tratamiento previo..."
                className={inp}
              />
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-3 bg-destructive/10 border border-destructive/15 rounded-lg px-4 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 py-4 border-t border-emerald-200 flex gap-3">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isSaving || isSigning}
          className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted/50 disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isSaving ? 'Guardando...' : 'Guardar borrador'}
        </button>
        <button
          type="button"
          onClick={handleSign}
          disabled={isSigning || isSaving}
          className="flex-1 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {isSigning
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Firmando...</>
            : <><CheckCircle2 className="w-4 h-4" /> Firmar consulta</>
          }
        </button>
      </div>

      {/* Sign validation modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Secciones sin completar</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Las siguientes secciones están vacías:</p>
            <ul className="space-y-1.5 mb-4">
              {missingSections.map(s => (
                <li key={s} className="flex items-center gap-2 text-sm text-foreground/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mb-5">La firma es válida aunque haya secciones vacías. Puedes completarlas antes o firmar de todas formas.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignModal(false)}
                className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted/50 transition-colors"
              >
                Volver y completar
              </button>
              <button
                onClick={executeSign}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Firmar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ConsultaCard — single past note with full audit trail ──────────────────────
interface AiNote extends ClinicalNote {
  isAiAssisted?: boolean
  aiSummary?: string
  transcriptText?: string
  transcriptDurationSeconds?: number
}

function downloadTranscript(note: AiNote) {
  if (!note.transcriptText) return
  const blob = new Blob([note.transcriptText], { type: 'text/plain; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transcript-${note.id.slice(0, 8)}-${new Date(note.createdAt).toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function ConsultaCard({ note: rawNote, onRefresh }: { note: ClinicalNote; onRefresh: () => void }) {
  const note = rawNote as AiNote
  const [expanded, setExpanded] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showComplementar, setShowComplementar] = useState(false)
  const isSigned = note.status === 'SIGNED'
  const canComplement = !isSigned

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Audit header — clic en cualquier parte del header para expandir/colapsar */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3 border-b border-border',
        expanded ? 'bg-[#0D1B2E]' : 'bg-muted'
      )}>
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-1 flex items-center gap-2.5 text-left"
        >
          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', expanded ? 'bg-card/15' : 'bg-primary/10')}>
            <UserCheck className={cn('w-3.5 h-3.5', expanded ? 'text-white' : 'text-primary')} />
          </div>
          <div>
            <p className={cn('text-xs font-semibold', expanded ? 'text-white' : 'text-foreground')}>
              Dr. {note.doctor?.firstName} {note.doctor?.lastName}
              {note.doctor?.specialty && (
                <span className={cn('font-normal', expanded ? 'text-white/70' : 'text-muted-foreground')}> · {note.doctor.specialty}</span>
              )}
            </p>
            <p className={cn('text-xs flex items-center gap-1', expanded ? 'text-white/60' : 'text-muted-foreground')}>
              <Clock className="w-3 h-3" />
              {formatDateTime(note.createdAt)}
              {note.signedAt && isSigned && (
                <span className={cn('ml-1', expanded ? 'text-green-300' : 'text-success')}>· Firmado {formatDate(note.signedAt)}</span>
              )}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {note.isAiAssisted && (
            <span className={cn(
              'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
              expanded ? 'bg-primary/20 text-blue-200' : 'bg-primary/15 text-primary'
            )}>
              <Brain className="w-3 h-3" />
              IA
            </span>
          )}
          <span className={cn(
            'text-xs px-2.5 py-0.5 rounded-full font-medium',
            isSigned
              ? expanded ? 'bg-green-400/20 text-green-300' : 'bg-success/15 text-success'
              : expanded ? 'bg-amber-400/20 text-amber-300' : 'bg-warning/15 text-warning'
          )}>
            {isSigned ? 'Firmada' : 'Borrador'}
          </span>
          {canComplement && (
            <button
              onClick={() => setShowComplementar(c => !c)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                showComplementar
                  ? 'bg-success/20 text-success border-success/40'
                  : 'bg-success/10 text-success hover:bg-success/20 border-success/30'
              )}
            >
              <PenLine className="w-3 h-3" />
              {showComplementar ? 'Cerrar' : 'Complementar'}
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)} className="ml-1">
            {expanded
              ? <ChevronUp className="w-4 h-4 text-white/70" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Summary (always visible) */}
      <div className="px-4 py-3">
        {note.chiefComplaint && (
          <p className="text-sm font-medium text-foreground">{note.chiefComplaint}</p>
        )}
        {note.vitalSigns && <VitalsStrip v={note.vitalSigns} />}
        {note.diagnoses?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.diagnoses.map((d: { code: string; description: string; type: string }, i: number) => (
              <span key={i} className={cn(
                'text-xs px-2 py-0.5 rounded font-medium',
                d.type === 'PRIMARY' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {d.code} · {d.description}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {note.evolutionNotes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Padecimiento actual</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{note.evolutionNotes}</p>
            </div>
          )}
          {note.physicalExam && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Exploración física</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{String(note.physicalExam)}</p>
            </div>
          )}
          {note.treatmentPlan && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Plan de tratamiento</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{note.treatmentPlan}</p>
            </div>
          )}

          {/* AI Summary — only for AI-assisted notes */}
          {note.isAiAssisted && note.aiSummary && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Brain className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-bold text-primary uppercase tracking-wide">Resumen IA</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{note.aiSummary}</p>
            </div>
          )}

          {/* Transcript — only for AI-assisted notes */}
          {note.isAiAssisted && note.transcriptText && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transcript de consulta</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTranscript(t => !t)}
                    className="text-xs text-primary hover:text-primary font-medium"
                  >
                    {showTranscript ? 'Ocultar' : 'Ver transcript'}
                  </button>
                  <button
                    onClick={() => downloadTranscript(note)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground/80 font-medium"
                  >
                    <Download className="w-3 h-3" />
                    Descargar
                  </button>
                </div>
              </div>
              {showTranscript && (
                <div className="bg-muted/50 border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
                  <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">
                    {note.transcriptText}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Complementar panel */}
      {showComplementar && (
        <ComplementarPanel
          note={note}
          onSaved={() => { setShowComplementar(false); onRefresh() }}
          onClose={() => setShowComplementar(false)}
        />
      )}
    </div>
  )
}

// ── ConsultasTab — merged Resumen + Historial + Expediente ─────────────────────
function ConsultasTab({
  patientId,
  patient,
  notes,
  onRefresh,
  autoOpen,
  autoOpenAppointmentId,
}: {
  patientId: string
  patient: PatientWithCount
  notes: ClinicalNote[]
  onRefresh: () => void
  autoOpen?: boolean
  autoOpenAppointmentId?: string
}) {
  const [newConsulta, setNewConsulta] = useState(() => autoOpen === true)

  useEffect(() => {
    if (autoOpen) setNewConsulta(true)
  }, [autoOpen])

  const sorted = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="space-y-5">
      {/* Medical background strip */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-destructive/60" /> Alergias
            </p>
            {patient.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {patient.allergies.map(a => (
                  <span key={a} className="text-xs bg-destructive/10 text-destructive border border-destructive/15 px-2 py-0.5 rounded-full">{a}</span>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground">Ninguna conocida</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Enf. crónicas</p>
            {patient.chronicConditions.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {patient.chronicConditions.map(c => (
                  <span key={c} className="text-xs bg-warning/10 text-warning border border-warning/15 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground">Ninguna</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Medicamentos actuales</p>
            {patient.currentMedications.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {patient.currentMedications.map(m => (
                  <span key={m} className="text-xs bg-primary/10 text-primary border border-primary rounded-full px-2 py-0.5">{m}</span>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground">Ninguno</p>}
          </div>
        </div>
      </div>

      {/* New consultation */}
      {!newConsulta ? (
        <button
          onClick={() => setNewConsulta(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/30 text-primary hover:border-primary/60 hover:bg-primary/5 rounded-xl py-3 text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Iniciar nueva consulta
        </button>
      ) : (
        <div className="bg-card rounded-xl border-2 border-primary/20 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-primary/5 border-b border-primary/10">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Nueva consulta</span>
            </div>
            <button onClick={() => setNewConsulta(false)} className="p-1 hover:bg-primary/10 rounded">
              <X className="w-4 h-4 text-primary" />
            </button>
          </div>
          <div className="p-5">
            <ClinicalNoteEditor
              patientId={patientId}
              patient={patient}
              appointmentId={autoOpenAppointmentId}
              onSaved={() => {
                setNewConsulta(false)
                onRefresh()
              }}
            />
          </div>
        </div>
      )}

      {/* Past consultations */}
      {sorted.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Historial de consultas ({sorted.length})
          </p>
          <div className="space-y-3">
            {sorted.map(note => <ConsultaCard key={note.id} note={note} onRefresh={onRefresh} />)}
          </div>
        </div>
      )}

      {sorted.length === 0 && !newConsulta && (
        <div className="text-center py-12 text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No hay consultas registradas
        </div>
      )}
    </div>
  )
}

// ── PrescriptionsTab ───────────────────────────────────────────────────────────
function PrescriptionsTab({ patientId, patientName, prescriptions, onRefresh, readOnly = false }: {
  patientId: string
  patientName: string
  prescriptions: Prescription[]
  onRefresh: () => void
  readOnly?: boolean
}) {
  const router = useRouter()
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRx, setEditingRx] = useState<any>(null)

  function openEdit(rx: Prescription) {
    setEditingRx({
      id: rx.id,
      patientId,
      patientName,
      items: (rx.items ?? []).map((it: any) => ({
        medicationName: it.medicationName ?? '',
        dose:           it.dose ?? '',
        route:          it.route ?? 'oral',
        frequency:      it.frequency ?? 'cada 8 horas',
        duration:       it.duration ?? '7 días',
        quantity:       it.quantity ?? '',
        instructions:   it.instructions ?? '',
      })),
      instructions: rx.instructions ?? '',
      followUpDate: rx.followUpDate ? new Date(rx.followUpDate).toISOString().split('T')[0]! : '',
    })
  }

  const STATUS_STYLE: Record<string, string> = {
    ACTIVE: 'bg-success/15 text-success', COMPLETED: 'bg-muted text-muted-foreground', CANCELLED: 'bg-destructive/15 text-destructive',
  }

  return (
    <div>
      {!readOnly && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Pill className="w-4 h-4" /> Nueva receta
          </button>
        </div>
      )}

      {prescriptions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm bg-card rounded-xl border border-border">
          <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />No hay recetas registradas
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  <p className="text-xs text-foreground/80 font-medium">
                    Dr. {rx.doctor?.firstName} {rx.doctor?.lastName}
                    <span className="font-normal text-muted-foreground"> · {formatDate(rx.createdAt)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {rx.sentViaWhatsApp && (
                    <span className="text-xs bg-success/10 text-success border border-success/15 px-2 py-0.5 rounded-full">✓ Enviada</span>
                  )}
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_STYLE[rx.status] ?? STATUS_STYLE['ACTIVE']!}`}>
                    {rx.status === 'ACTIVE' ? 'Activa' : rx.status === 'COMPLETED' ? 'Completada' : 'Cancelada'}
                  </span>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                {rx.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">{i + 1}</span>
                    <div>
                      <span className="text-sm font-semibold text-foreground">{item.medicationName}</span>
                      <span className="text-sm text-muted-foreground"> {item.dose}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.route} · {item.frequency} · {item.duration}{item.instructions && ` · ${item.instructions}`}</p>
                    </div>
                  </div>
                ))}
                {rx.instructions && <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">{rx.instructions}</p>}
                {rx.followUpDate && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">Seguimiento: <span className="font-medium text-foreground/80">{formatDate(rx.followUpDate)}</span></span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border bg-muted/50">
                <button onClick={() => router.push(`/recetas/${rx.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground/80 hover:bg-card transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Ver / Imprimir
                </button>
                {!readOnly && rx.status === 'ACTIVE' && (
                  <button onClick={() => openEdit(rx)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground/80 hover:bg-card transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showBuilder && (
        <PrescriptionBuilder patientId={patientId} onClose={() => setShowBuilder(false)} onCreated={() => { setShowBuilder(false); onRefresh() }} />
      )}
      {editingRx && (
        <PrescriptionBuilder onClose={() => setEditingRx(null)} onCreated={() => { setEditingRx(null); onRefresh() }} existing={editingRx} />
      )}
    </div>
  )
}

// ── MarkdownBlock — renders Claude's markdown with design-system styles ────────
function renderInline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/).map((p, idx) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={idx} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
      : <span key={idx}>{p}</span>
  )
}

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (/^# /.test(line)) {
      elements.push(<p key={i} className="text-sm font-bold text-primary mt-3 mb-1">{line.slice(2)}</p>)
    } else if (/^#{1,3} /.test(line)) {
      elements.push(<p key={i} className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-3 mb-1">{line.replace(/^#+\s/, '')}</p>)
    } else if (/^-{3,}$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-primary/10 my-2" />)
    } else if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s\-|:]+\|/.test(lines[i + 1] ?? '')) {
      const headers = line.split('|').map(s => s.trim()).filter(Boolean)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && /^\|/.test(lines[i] ?? '')) {
        rows.push((lines[i] ?? '').split('|').map(s => s.trim()).filter(Boolean))
        i++
      }
      elements.push(
        <div key={`t${i}`} className="overflow-x-auto rounded-lg border border-primary/10 my-2">
          <table className="w-full text-xs">
            <thead className="bg-primary/5">
              <tr>{headers.map((h, j) => <th key={j} className="px-3 py-2 text-left font-semibold text-primary">{renderInline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-muted/50'}>
                  {row.map((cell, ci) => <td key={ci} className="px-3 py-1.5 text-foreground/80 border-t border-border">{renderInline(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    } else if (/^[-•–]\s/.test(line)) {
      elements.push(<p key={i} className="text-sm text-foreground/80 pl-3 border-l-2 border-primary/20 my-1">{renderInline(line.replace(/^[-•–]\s/, ''))}</p>)
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />)
    } else {
      elements.push(<p key={i} className="text-sm text-foreground/80 leading-relaxed">{renderInline(line)}</p>)
    }
    i++
  }
  return <div className="space-y-0.5">{elements}</div>
}

// ── ProgressBar — generic animated progress bar ───────────────────────────────
function ProgressBar({ durationSecs, color = '#4E2DD2' }: { durationSecs: number; color?: string }) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const tick = 200
    const step = 100 / (durationSecs * (1000 / tick))
    const interval = setInterval(() => {
      setProgress(p => {
        const next = p + step
        if (next >= 95) { clearInterval(interval); return 95 }
        return next
      })
    }, tick)
    return () => clearInterval(interval)
  }, [durationSecs])
  return (
    <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: `${color}1a` }}>
      <div
        className="h-full rounded-full transition-all duration-200 ease-out"
        style={{ width: `${progress}%`, background: color }}
      />
    </div>
  )
}

// ── AISummarizeProgress ────────────────────────────────────────────────────────
function AISummarizeProgress() {
  const stages = ['Leyendo el PDF…', 'Identificando valores fuera de rango…', 'Interpretando hallazgos clínicos…', 'Generando resumen final…']
  const [stageIdx, setStageIdx] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setStageIdx(i => Math.min(i + 1, stages.length - 1)), 4500)
    return () => clearInterval(interval)
  }, [stages.length])
  return (
    <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <p className="text-xs font-semibold text-primary">Analizando con IA</p>
        </div>
        <p className="text-xs text-primary/50">~18s</p>
      </div>
      <ProgressBar durationSecs={18} />
      <p className="text-xs text-primary/70">{stages[stageIdx] ?? ''}</p>
    </div>
  )
}

// ── UploadProgress ─────────────────────────────────────────────────────────────
function UploadProgress({ stage, fileName }: { stage: 'uploading' | 'analyzing'; fileName: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
        <FlaskConical className="w-5 h-5 text-warning shrink-0" />
        <p className="text-sm text-muted-foreground flex-1 truncate">{fileName}</p>
      </div>
      {stage === 'uploading' ? (
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">Subiendo PDF</p>
            </div>
            <p className="text-xs text-muted-foreground">~4s</p>
          </div>
          <ProgressBar durationSecs={4} color="#6b7280" />
        </div>
      ) : (
        <AISummarizeProgress />
      )}
    </div>
  )
}

// ── LabResultCard ──────────────────────────────────────────────────────────────
function LabResultCard({ result, onRefresh }: { result: LabResult; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [showPdf, setShowPdf] = useState(false)
  const [notes, setNotes] = useState(result.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [summarizeError, setSummarizeError] = useState('')

  async function handleSummarize() {
    setSummarizing(true)
    setSummarizeError('')
    try {
      await api.labResults.summarize(result.id)
      onRefresh()
    } catch (err) {
      setSummarizeError(err instanceof Error ? err.message : 'Error al analizar')
    } finally { setSummarizing(false) }
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    try {
      await api.labResults.updateNotes(result.id, notes)
      onRefresh()
    } catch { /* ignore */ }
    finally { setSavingNotes(false) }
  }

  const STATUS_STYLE: Record<string, string> = {
    PENDING:  'bg-muted text-muted-foreground',
    RECEIVED: 'bg-warning/15 text-warning',
    REVIEWED: 'bg-success/15 text-success',
    NOTIFIED: 'bg-primary/15 text-primary',
  }
  const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Pendiente', RECEIVED: 'Recibido', REVIEWED: 'Revisado', NOTIFIED: 'Notificado',
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 border-b border-border transition-colors text-left',
          expanded ? 'bg-[#0D1B2E]' : 'bg-muted hover:bg-muted'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <FlaskConical className={cn('w-4 h-4 shrink-0', expanded ? 'text-orange-300' : 'text-warning')} />
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold truncate', expanded ? 'text-white' : 'text-foreground')}>{result.title}</p>
            <p className={cn('text-xs', expanded ? 'text-white/60' : 'text-muted-foreground')}>
              {result.laboratoryName && `${result.laboratoryName} · `}{formatDate(result.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            expanded
              ? 'bg-card/20 text-white'
              : (STATUS_STYLE[result.status] ?? 'bg-muted text-muted-foreground')
          )}>
            {STATUS_LABEL[result.status] ?? result.status}
          </span>
          {(result.fileUrl ?? result.externalUrl) && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowPdf(true); }}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 text-xs rounded-lg font-medium transition-colors',
                expanded
                  ? 'text-white/80 hover:bg-card/10'
                  : 'text-primary hover:bg-primary/10'
              )}
            >
              <FileText className="w-3.5 h-3.5" /> Ver PDF
            </button>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-white/70" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* PDF viewer modal */}
      {showPdf && (result.fileUrl ?? result.externalUrl) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground truncate">{result.title}</p>
              <div className="flex items-center gap-2">
                <a href={result.fileUrl ?? result.externalUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground/80 px-2 py-1 rounded hover:bg-muted">
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir en nueva pestaña
                </a>
                <button onClick={() => setShowPdf(false)} className="p-1.5 hover:bg-muted rounded-lg">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <iframe
              src={result.fileUrl ?? result.externalUrl ?? ''}
              className="flex-1 w-full"
              title={result.title}
            />
          </div>
        </div>
      )}

      {/* Preview: AI analysis badge */}
      {!expanded && result.llmSummary && (
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-primary shrink-0" />
          <p className="text-xs text-primary font-medium">Análisis IA disponible · Expandir para ver</p>
        </div>
      )}

      {expanded && (
        <div className="p-4 space-y-4">
          {/* AI Summary */}
          {summarizing ? (
            <AISummarizeProgress />
          ) : result.llmSummary ? (
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-bold text-primary uppercase tracking-wide">Análisis IA</p>
              </div>
              <MarkdownBlock text={result.llmSummary} />
            </div>
          ) : result.fileUrl ? (
            <>
              <button
                onClick={handleSummarize}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-primary/30 text-primary hover:bg-primary/5 rounded-xl py-3 text-sm font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Analizar con IA
              </button>
              {summarizeError && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{summarizeError}</p>
              )}
            </>
          ) : null}

          {/* Doctor notes */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Notas del médico
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones, interpretación clínica, indicaciones..."
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
            {notes !== (result.notes ?? '') && (
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg disabled:opacity-50"
              >
                {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Guardar notas
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── LabTab ─────────────────────────────────────────────────────────────────────
function LabTab({ patientId, results, onRefresh, editMode, onExitEdit }: { patientId: string; results: LabResult[]; onRefresh: () => void; editMode: boolean; onExitEdit: () => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function toggleSelect(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return
    setDeleting(true)
    try {
      await Promise.all([...selected].map(id => api.labResults.remove(id)))
      setSelected(new Set())
      onExitEdit()
      onRefresh()
    } catch { /* ignore */ }
    finally { setDeleting(false) }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') {
      setFile(dropped)
      if (!title) setTitle(dropped.name.replace(/\.pdf$/i, ''))
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      if (!title) setTitle(selected.name.replace(/\.pdf$/i, ''))
    }
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const res = await api.labResults.create({ patientId, title: title || file.name }) as { data: { id: string } }
      const labId = res.data.id
      const formData = new FormData()
      formData.append('file', file)
      await api.labResults.upload(labId, formData)
      setUploading(false)
      setAnalyzing(true)
      await api.labResults.summarize(labId).catch(() => {})
      setFile(null)
      setTitle('')
      onRefresh()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div className="bg-card rounded-xl border border-border p-5">
        <p className="text-sm font-semibold text-foreground mb-3">Subir resultado de laboratorio</p>

        {!file ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40 hover:bg-muted/50'
            )}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">Arrastra el PDF aquí o haz clic para seleccionar</p>
            <p className="text-xs text-muted-foreground mt-1">Solo archivos PDF</p>
            <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          </div>
        ) : uploading || analyzing ? (
          <UploadProgress stage={uploading ? 'uploading' : 'analyzing'} fileName={file.name} />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
              <FlaskConical className="w-5 h-5 text-warning shrink-0" />
              <p className="text-sm text-foreground flex-1 truncate">{file.name}</p>
              <button onClick={() => setFile(null)} className="p-1 hover:bg-muted rounded">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Título del estudio</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="ej. Biometría Hemática Completa"
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            {uploadError && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{uploadError}</p>}
            <button
              onClick={handleUpload}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Subir y analizar con IA
            </button>
          </div>
        )}
      </div>

      {/* Results list */}
      {results.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
          No hay resultados de laboratorio
        </div>
      ) : (
        <div className="space-y-3">
          {/* Delete toolbar — only in edit mode */}
          {editMode && selected.size > 0 && (
            <div className="flex items-center justify-between bg-destructive/10 border border-destructive/15 rounded-xl px-4 py-2.5">
              <p className="text-sm text-destructive font-medium">{selected.size} estudio{selected.size > 1 ? 's' : ''} seleccionado{selected.size > 1 ? 's' : ''}</p>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="flex items-center gap-1.5 text-xs bg-destructive hover:bg-destructive/90 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-lg"
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                Eliminar
              </button>
            </div>
          )}
          {results.map(r => (
            <div key={r.id} className="flex items-start gap-2">
              {editMode && (
                <button
                  onClick={() => toggleSelect(r.id)}
                  className={cn(
                    'mt-3.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                    selected.has(r.id) ? 'bg-destructive border-destructive' : 'border-border hover:border-destructive'
                  )}
                >
                  {selected.has(r.id) && <X className="w-3 h-3 text-white" />}
                </button>
              )}
              <div className="flex-1 min-w-0">
                <LabResultCard result={r} onRefresh={onRefresh} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [patient, setPatient] = useState<PatientWithCount | null>(null)
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('consultas')
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [labEditMode, setLabEditMode] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [autoOpenConsulta, setAutoOpenConsulta] = useState(false)
  const [autoOpenAppointmentId, setAutoOpenAppointmentId] = useState<string | undefined>(undefined)

  // Only STAFF ("Administrativo") is restricted — ADMIN is the clinic owner/doctor and has full access
  const isReadOnly = userRole === 'STAFF'

  useEffect(() => {
    loadPatient()
    loadTimeline()
    getUserRole().then(role => setUserRole(role))
    // Check if we arrived here from "Iniciar consulta" / takeover in the agenda
    // Value is the appointment ID (used both as flag and to link the new note)
    const aptId = sessionStorage.getItem('_open_new_consulta')
    if (aptId) {
      sessionStorage.removeItem('_open_new_consulta')
      setActiveTab('consultas')
      setAutoOpenConsulta(true)
      setAutoOpenAppointmentId(aptId)
    }
  }, [id])

  // Restrict tab to recetas for admin roles once role is known
  useEffect(() => {
    if (isReadOnly) setActiveTab('recetas')
  }, [isReadOnly])

  async function loadPatient() {
    try {
      const res = await api.patients.get(id) as { data: PatientWithCount }
      setPatient(res.data)
    } catch { router.push('/pacientes') }
    finally { setLoading(false) }
  }

  async function loadTimeline() {
    try {
      const res = await api.patients.timeline(id) as { data: Timeline }
      setTimeline(res.data)
    } catch {}
  }

  if (loading || !patient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const allTabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'consultas',  label: 'Consultas',   icon: <Stethoscope className="w-4 h-4" />, count: patient._count.clinicalNotes },
    { key: 'recetas',    label: 'Recetas',      icon: <Pill className="w-4 h-4" />,        count: patient._count.prescriptions },
    { key: 'lab',        label: 'Laboratorio',  icon: <FlaskConical className="w-4 h-4" />, count: patient._count.labResults },
  ]
  // STAFF only sees Recetas tab (ADMIN = clinic owner/doctor, has full access)
  const TABS = isReadOnly ? allTabs.filter(t => t.key === 'recetas') : allTabs

  return (
    <>
      <Header
        title={`${patient.firstName} ${patient.lastName}`}
        subtitle={patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} años${patient.gender ? ` · ${GENDER_LABELS[patient.gender]}` : ''}` : ''}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <button onClick={() => router.push('/pacientes')}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        {/* Patient hero */}
        <div className="bg-card border-b border-border px-6 py-5">
          <div className="flex items-start gap-5">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary text-xl font-bold">
                {getInitials(patient.firstName, patient.lastName)}
              </div>
              <button
                onClick={() => setShowProfile(true)}
                className="text-xs text-primary hover:text-primary font-medium whitespace-nowrap transition-colors"
              >
                Ver perfil
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{patient.phone}</span>
                {patient.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{patient.email}</span>}
                {patient.dateOfBirth && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(patient.dateOfBirth)}</span>}
                <span className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5" />{BLOOD_TYPE_LABELS[patient.bloodType]}</span>
              </div>
              {patient.allergies.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-xs text-destructive font-medium">Alergias: {patient.allergies.join(', ')}</span>
                </div>
              )}
              {(patient as any).lastModifiedByName && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Modificado por <span className="font-medium text-muted-foreground">{(patient as any).lastModifiedByName}</span>
                  {(patient as any).lastModifiedAt && (
                    <> · {formatDateTime((patient as any).lastModifiedAt)}</>
                  )}
                </p>
              )}
            </div>
            <div className="flex gap-4 shrink-0">
              {[
                { label: 'Consultas', value: patient._count.clinicalNotes },
                { label: 'Recetas',   value: patient._count.prescriptions },
                { label: 'Lab',       value: patient._count.labResults },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center mt-5 border-b border-border -mb-px">
            <div className="flex gap-1 flex-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setLabEditMode(false) }}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground/80'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={cn(
                      'text-xs rounded-full px-1.5 py-0.5 font-semibold min-w-[1.25rem] text-center',
                      activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {activeTab === 'lab' && (timeline?.labResults ?? []).length > 0 && (
              <button
                onClick={() => setLabEditMode(m => !m)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 mb-1 rounded-lg text-xs font-medium transition-colors',
                  labEditMode
                    ? 'bg-destructive/10 text-destructive hover:bg-destructive/15'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground/80'
                )}
              >
                {labEditMode ? <><X className="w-3.5 h-3.5" /> Cancelar</> : <><Pencil className="w-3.5 h-3.5" /> Editar</>}
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'consultas' && (
            <ConsultasTab
              patientId={id}
              patient={patient}
              notes={timeline?.notes ?? []}
              onRefresh={loadTimeline}
              autoOpen={autoOpenConsulta}
              autoOpenAppointmentId={autoOpenAppointmentId}
            />
          )}
          {activeTab === 'recetas' && (
            <PrescriptionsTab
              patientId={id}
              patientName={`${patient.firstName} ${patient.lastName}`}
              prescriptions={timeline?.prescriptions ?? []}
              onRefresh={loadTimeline}
              readOnly={isReadOnly}
            />
          )}
          {activeTab === 'lab' && (
            <LabTab patientId={id} results={timeline?.labResults ?? []} onRefresh={loadTimeline} editMode={labEditMode} onExitEdit={() => setLabEditMode(false)} />
          )}
        </div>
      </div>

      {showProfile && patient && (
        <PatientProfileModal
          patient={patient}
          onClose={() => setShowProfile(false)}
          onEdit={() => setShowEdit(true)}
        />
      )}

      {showEdit && patient && (
        <EditPatientModal
          patient={patient}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setPatient(prev => prev ? { ...prev, ...updated } : updated)
            setShowEdit(false)
          }}
        />
      )}
    </>
  )
}
