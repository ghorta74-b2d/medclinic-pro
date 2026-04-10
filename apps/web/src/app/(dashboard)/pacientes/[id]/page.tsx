'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate, formatDateTime, getInitials, calculateAge, formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, Phone, Mail, Calendar, Droplets, AlertTriangle,
  FileText, Pill, FlaskConical, ChevronDown, ChevronUp, Clock,
  Pencil, X, Check, Loader2, Printer, Plus, Stethoscope, UserCheck,
  Upload, Sparkles, ExternalLink,
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
        dateOfBirth:        form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
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

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4E2DD2]/40 focus:border-[#4E2DD2]'
  const lbl = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">Editar paciente</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Datos personales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Nombre(s) *</label><input required value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Apellidos *</label><input required value={form.lastName} onChange={e => set('lastName', e.target.value)} className={inp} /></div>
              <div>
                <label className={lbl}>WhatsApp *</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-600 font-medium select-none">+52</span>
                  <input type="tel" inputMode="numeric" placeholder="5512345678" value={phoneDigits}
                    onChange={e => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4E2DD2]/40" />
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
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Domicilio</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className={lbl}>Dirección</label><input value={form.address} onChange={e => set('address', e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Ciudad</label><input value={form.city} onChange={e => set('city', e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Estado</label><input value={form.state} onChange={e => set('state', e.target.value)} className={inp} /></div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Antecedentes médicos</h3>
            <div className="space-y-3">
              <div><label className={lbl}>Alergias <span className="font-normal text-gray-400">(separadas por comas)</span></label><input value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder="Penicilina, Sulfa..." className={inp} /></div>
              <div><label className={lbl}>Enfermedades crónicas <span className="font-normal text-gray-400">(separadas por comas)</span></label><input value={form.chronicConditions} onChange={e => set('chronicConditions', e.target.value)} placeholder="Diabetes, Hipertensión..." className={inp} /></div>
              <div><label className={lbl}>Medicamentos actuales <span className="font-normal text-gray-400">(separados por comas)</span></label><input value={form.currentMedications} onChange={e => set('currentMedications', e.target.value)} placeholder="Metformina 500mg, Losartán..." className={inp} /></div>
              <div><label className={lbl}>Notas internas</label><textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className={`${inp} resize-none`} placeholder="Observaciones del expediente..." /></div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Contacto de emergencia</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Nombre</label><input value={form.emergencyName} onChange={e => set('emergencyName', e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Teléfono</label><input value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} className={inp} /></div>
            </div>
          </section>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#4E2DD2] hover:bg-[#3d22a8] disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
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
  const items = [
    v.weightKg    !== undefined ? `${v.weightKg} kg`                               : null,
    v.heightCm    !== undefined ? `${v.heightCm} cm`                               : null,
    (v.systolicBp !== undefined && v.diastolicBp !== undefined) ? `${v.systolicBp}/${v.diastolicBp} mmHg` : null,
    v.heartRateBpm !== undefined ? `${v.heartRateBpm} lpm`                         : null,
    v.temperatureC !== undefined ? `${v.temperatureC} °C`                          : null,
    v.spo2Percent  !== undefined ? `${v.spo2Percent}% SpO₂`                        : null,
    v.glucoseMgDl  !== undefined ? `${v.glucoseMgDl} mg/dL`                        : null,
  ].filter(Boolean) as string[]

  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item) => (
        <span key={item} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{item}</span>
      ))}
    </div>
  )
}

// ── ConsultaCard — single past note with full audit trail ──────────────────────
function ConsultaCard({ note }: { note: ClinicalNote }) {
  const [expanded, setExpanded] = useState(false)
  const isSigned = note.status === 'SIGNED'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Audit header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#4E2DD2]/10 rounded-full flex items-center justify-center shrink-0">
            <UserCheck className="w-3.5 h-3.5 text-[#4E2DD2]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">
              Dr. {note.doctor?.firstName} {note.doctor?.lastName}
              {note.doctor?.specialty && (
                <span className="font-normal text-gray-500"> · {note.doctor.specialty}</span>
              )}
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(note.createdAt)}
              {note.signedAt && isSigned && (
                <span className="ml-1 text-green-600">· Firmado {formatDate(note.signedAt)}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs px-2.5 py-0.5 rounded-full font-medium',
            isSigned ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          )}>
            {isSigned ? 'Firmada' : 'Borrador'}
          </span>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
        </div>
      </div>

      {/* Summary (always visible) */}
      <div className="px-4 py-3">
        {note.chiefComplaint && (
          <p className="text-sm font-medium text-gray-900">{note.chiefComplaint}</p>
        )}
        {note.vitalSigns && <VitalsStrip v={note.vitalSigns} />}
        {note.diagnoses?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.diagnoses.map((d: { code: string; description: string; type: string }, i: number) => (
              <span key={i} className={cn(
                'text-xs px-2 py-0.5 rounded font-medium',
                d.type === 'PRIMARY' ? 'bg-[#4E2DD2]/10 text-[#4E2DD2]' : 'bg-gray-100 text-gray-600'
              )}>
                {d.code} · {d.description}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
          {note.physicalExam && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Exploración física</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.physicalExam}</p>
            </div>
          )}
          {note.treatmentPlan && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Plan de tratamiento</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.treatmentPlan}</p>
            </div>
          )}
          {note.evolutionNotes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Evolución</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.evolutionNotes}</p>
            </div>
          )}
        </div>
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
}: {
  patientId: string
  patient: PatientWithCount
  notes: ClinicalNote[]
  onRefresh: () => void
}) {
  const [newConsulta, setNewConsulta] = useState(false)

  const sorted = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="space-y-5">
      {/* Medical background strip */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" /> Alergias
            </p>
            {patient.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {patient.allergies.map(a => (
                  <span key={a} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">{a}</span>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Ninguna conocida</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Enf. crónicas</p>
            {patient.chronicConditions.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {patient.chronicConditions.map(c => (
                  <span key={c} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Ninguna</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Medicamentos actuales</p>
            {patient.currentMedications.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {patient.currentMedications.map(m => (
                  <span key={m} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{m}</span>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Ninguno</p>}
          </div>
        </div>
      </div>

      {/* New consultation */}
      {!newConsulta ? (
        <button
          onClick={() => setNewConsulta(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#4E2DD2]/30 text-[#4E2DD2] hover:border-[#4E2DD2]/60 hover:bg-[#4E2DD2]/5 rounded-xl py-3 text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Iniciar nueva consulta
        </button>
      ) : (
        <div className="bg-white rounded-xl border-2 border-[#4E2DD2]/20 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-[#4E2DD2]/5 border-b border-[#4E2DD2]/10">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#4E2DD2]" />
              <span className="text-sm font-semibold text-[#4E2DD2]">Nueva consulta</span>
            </div>
            <button onClick={() => setNewConsulta(false)} className="p-1 hover:bg-[#4E2DD2]/10 rounded">
              <X className="w-4 h-4 text-[#4E2DD2]" />
            </button>
          </div>
          <div className="p-5">
            <ClinicalNoteEditor
              patientId={patientId}
              patient={patient}
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Historial de consultas ({sorted.length})
          </p>
          <div className="space-y-3">
            {sorted.map(note => <ConsultaCard key={note.id} note={note} />)}
          </div>
        </div>
      )}

      {sorted.length === 0 && !newConsulta && (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No hay consultas registradas
        </div>
      )}
    </div>
  )
}

// ── PrescriptionsTab ───────────────────────────────────────────────────────────
function PrescriptionsTab({ patientId, patientName, prescriptions, onRefresh }: {
  patientId: string
  patientName: string
  prescriptions: Prescription[]
  onRefresh: () => void
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
    ACTIVE: 'bg-green-100 text-green-700', COMPLETED: 'bg-gray-100 text-gray-500', CANCELLED: 'bg-red-100 text-red-600',
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-[#4E2DD2] hover:bg-[#3d22a8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Pill className="w-4 h-4" /> Nueva receta
        </button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
          <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />No hay recetas registradas
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-[#4E2DD2]" />
                  <p className="text-xs text-gray-700 font-medium">
                    Dr. {rx.doctor?.firstName} {rx.doctor?.lastName}
                    <span className="font-normal text-gray-400"> · {formatDate(rx.createdAt)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {rx.sentViaWhatsApp && (
                    <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">✓ Enviada</span>
                  )}
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_STYLE[rx.status] ?? STATUS_STYLE['ACTIVE']!}`}>
                    {rx.status === 'ACTIVE' ? 'Activa' : rx.status === 'COMPLETED' ? 'Completada' : 'Cancelada'}
                  </span>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                {rx.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#4E2DD2] text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">{i + 1}</span>
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{item.medicationName}</span>
                      <span className="text-sm text-gray-500"> {item.dose}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{item.route} · {item.frequency} · {item.duration}{item.instructions && ` · ${item.instructions}`}</p>
                    </div>
                  </div>
                ))}
                {rx.instructions && <p className="text-xs text-gray-500 italic pt-2 border-t border-gray-100">{rx.instructions}</p>}
                {rx.followUpDate && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs text-gray-500">Seguimiento: <span className="font-medium text-gray-700">{formatDate(rx.followUpDate)}</span></span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <button onClick={() => router.push(`/recetas/${rx.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-white transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Ver / Imprimir
                </button>
                {rx.status === 'ACTIVE' && (
                  <button onClick={() => openEdit(rx)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-white transition-colors">
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
      ? <strong key={idx} className="font-semibold text-gray-900">{p.slice(2, -2)}</strong>
      : <span key={idx}>{p}</span>
  )
}

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^# /.test(line)) {
      elements.push(<p key={i} className="text-sm font-bold text-[#4E2DD2] mt-3 mb-1">{line.slice(2)}</p>)
    } else if (/^#{1,3} /.test(line)) {
      elements.push(<p key={i} className="text-xs font-bold text-gray-600 uppercase tracking-wide mt-3 mb-1">{line.replace(/^#+\s/, '')}</p>)
    } else if (/^-{3,}$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-[#4E2DD2]/10 my-2" />)
    } else if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s\-|:]+\|/.test(lines[i + 1])) {
      const headers = line.split('|').map(s => s.trim()).filter(Boolean)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i].split('|').map(s => s.trim()).filter(Boolean))
        i++
      }
      elements.push(
        <div key={`t${i}`} className="overflow-x-auto rounded-lg border border-[#4E2DD2]/10 my-2">
          <table className="w-full text-xs">
            <thead className="bg-[#4E2DD2]/5">
              <tr>{headers.map((h, j) => <th key={j} className="px-3 py-2 text-left font-semibold text-[#4E2DD2]">{renderInline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-gray-50/50'}>
                  {row.map((cell, ci) => <td key={ci} className="px-3 py-1.5 text-gray-700 border-t border-gray-100">{renderInline(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    } else if (/^[-•–]\s/.test(line)) {
      elements.push(<p key={i} className="text-sm text-gray-700 pl-3 border-l-2 border-[#4E2DD2]/20 my-1">{renderInline(line.replace(/^[-•–]\s/, ''))}</p>)
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />)
    } else {
      elements.push(<p key={i} className="text-sm text-gray-700 leading-relaxed">{renderInline(line)}</p>)
    }
    i++
  }
  return <div className="space-y-0.5">{elements}</div>
}

// ── AISummarizeProgress ────────────────────────────────────────────────────────
function AISummarizeProgress() {
  const [progress, setProgress] = useState(0)
  const stages = ['Leyendo el PDF…', 'Identificando valores fuera de rango…', 'Interpretando hallazgos clínicos…', 'Generando resumen final…']
  const stageIdx = Math.min(Math.floor(progress / 25), stages.length - 1)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        const next = p + 100 / 18 // ~18s total (sonnet is faster)
        if (next >= 95) { clearInterval(interval); return 95 }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-[#4E2DD2]/5 border border-[#4E2DD2]/15 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#4E2DD2] animate-pulse" />
        <p className="text-xs font-semibold text-[#4E2DD2]">Analizando con IA</p>
      </div>
      <div className="w-full bg-[#4E2DD2]/10 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-[#4E2DD2] rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-[#4E2DD2]/70">{stages[stageIdx]}</p>
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
    PENDING:  'bg-gray-100 text-gray-600',
    RECEIVED: 'bg-yellow-100 text-yellow-700',
    REVIEWED: 'bg-green-100 text-green-700',
    NOTIFIED: 'bg-blue-100 text-blue-700',
  }
  const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Pendiente', RECEIVED: 'Recibido', REVIEWED: 'Revisado', NOTIFIED: 'Notificado',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <FlaskConical className="w-4 h-4 text-orange-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{result.title}</p>
            <p className="text-xs text-gray-400">
              {result.laboratoryName && `${result.laboratoryName} · `}{formatDate(result.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLE[result.status] ?? 'bg-gray-100 text-gray-600')}>
            {STATUS_LABEL[result.status] ?? result.status}
          </span>
          {(result.fileUrl ?? result.externalUrl) && (
            <button
              onClick={() => setShowPdf(true)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-[#4E2DD2] hover:bg-[#4E2DD2]/10 rounded-lg font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Ver PDF
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)} className="p-1 hover:bg-gray-200 rounded">
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
        </div>
      </div>

      {/* PDF viewer modal */}
      {showPdf && (result.fileUrl ?? result.externalUrl) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{result.title}</p>
              <div className="flex items-center gap-2">
                <a href={result.fileUrl ?? result.externalUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100">
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir en nueva pestaña
                </a>
                <button onClick={() => setShowPdf(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4 text-gray-500" />
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
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-[#4E2DD2] shrink-0" />
          <p className="text-xs text-[#4E2DD2] font-medium">Análisis IA disponible · Expandir para ver</p>
        </div>
      )}

      {expanded && (
        <div className="p-4 space-y-4">
          {/* AI Summary */}
          {summarizing ? (
            <AISummarizeProgress />
          ) : result.llmSummary ? (
            <div className="bg-[#4E2DD2]/5 border border-[#4E2DD2]/15 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#4E2DD2]" />
                <p className="text-xs font-bold text-[#4E2DD2] uppercase tracking-wide">Análisis IA</p>
              </div>
              <MarkdownBlock text={result.llmSummary} />
            </div>
          ) : result.fileUrl ? (
            <>
              <button
                onClick={handleSummarize}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-[#4E2DD2]/30 text-[#4E2DD2] hover:bg-[#4E2DD2]/5 rounded-xl py-3 text-sm font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Analizar con IA
              </button>
              {summarizeError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{summarizeError}</p>
              )}
            </>
          ) : null}

          {/* Doctor notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Notas del médico
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones, interpretación clínica, indicaciones..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4E2DD2]/30 focus:border-[#4E2DD2] resize-none"
            />
            {notes !== (result.notes ?? '') && (
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#4E2DD2] text-white text-xs font-medium rounded-lg disabled:opacity-50"
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
function LabTab({ patientId, results, onRefresh }: { patientId: string; results: LabResult[]; onRefresh: () => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
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
      // summarize is best-effort — don't block upload if AI fails
      api.labResults.summarize(labId).catch(() => {})
      setFile(null)
      setTitle('')
      onRefresh()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-800 mb-3">Subir resultado de laboratorio</p>

        {!file ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              dragOver
                ? 'border-[#4E2DD2] bg-[#4E2DD2]/5'
                : 'border-gray-200 hover:border-[#4E2DD2]/40 hover:bg-gray-50'
            )}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">Arrastra el PDF aquí o haz clic para seleccionar</p>
            <p className="text-xs text-gray-400 mt-1">Solo archivos PDF</p>
            <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <FlaskConical className="w-5 h-5 text-orange-400 shrink-0" />
              <p className="text-sm text-gray-800 flex-1 truncate">{file.name}</p>
              <button onClick={() => setFile(null)} className="p-1 hover:bg-gray-200 rounded">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Título del estudio</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="ej. Biometría Hemática Completa"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4E2DD2]/30 focus:border-[#4E2DD2]"
              />
            </div>
            {uploadError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{uploadError}</p>}
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-[#4E2DD2] hover:bg-[#3d22a8] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo y analizando con IA...</>
                : <><Sparkles className="w-4 h-4" /> Subir y analizar con IA</>}
            </button>
          </div>
        )}
      </div>

      {/* Results list */}
      {results.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200">
          No hay resultados de laboratorio
        </div>
      ) : (
        <div className="space-y-3">
          {/* Delete toolbar */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <p className="text-sm text-red-700 font-medium">{selected.size} estudio{selected.size > 1 ? 's' : ''} seleccionado{selected.size > 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-lg"
                >
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                  Eliminar
                </button>
              </div>
            </div>
          )}
          {results.map(r => (
            <div key={r.id} className="flex items-start gap-2">
              <button
                onClick={() => toggleSelect(r.id)}
                className={cn(
                  'mt-3.5 shrink-0 w-4 h-4 rounded border-2 transition-colors',
                  selected.has(r.id) ? 'bg-red-500 border-red-500' : 'border-gray-300 hover:border-red-400'
                )}
              >
                {selected.has(r.id) && <X className="w-3 h-3 text-white m-auto" />}
              </button>
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

  useEffect(() => {
    loadPatient()
    loadTimeline()
  }, [id])

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
        <div className="w-6 h-6 border-2 border-[#4E2DD2] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'consultas',  label: 'Consultas',   icon: <Stethoscope className="w-4 h-4" />, count: patient._count.clinicalNotes },
    { key: 'recetas',    label: 'Recetas',      icon: <Pill className="w-4 h-4" />,        count: patient._count.prescriptions },
    { key: 'lab',        label: 'Laboratorio',  icon: <FlaskConical className="w-4 h-4" />, count: patient._count.labResults },
  ]

  return (
    <>
      <Header
        title={`${patient.firstName} ${patient.lastName}`}
        subtitle={patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} años${patient.gender ? ` · ${GENDER_LABELS[patient.gender]}` : ''}` : ''}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 bg-[#4E2DD2] hover:bg-[#3d22a8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <button onClick={() => router.push('/pacientes')}
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        {/* Patient hero */}
        <div className="bg-white border-b border-gray-200 px-6 py-5">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-[#4E2DD2]/10 rounded-2xl flex items-center justify-center text-[#4E2DD2] text-xl font-bold shrink-0">
              {getInitials(patient.firstName, patient.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{patient.phone}</span>
                {patient.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{patient.email}</span>}
                {patient.dateOfBirth && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(patient.dateOfBirth)}</span>}
                <span className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5" />{BLOOD_TYPE_LABELS[patient.bloodType]}</span>
              </div>
              {patient.allergies.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs text-red-700 font-medium">Alergias: {patient.allergies.join(', ')}</span>
                </div>
              )}
            </div>
            <div className="flex gap-4 shrink-0">
              {[
                { label: 'Consultas', value: patient._count.clinicalNotes },
                { label: 'Recetas',   value: patient._count.prescriptions },
                { label: 'Lab',       value: patient._count.labResults },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 border-b border-gray-100 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-[#4E2DD2] text-[#4E2DD2]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn(
                    'text-xs rounded-full px-1.5 py-0.5 font-semibold min-w-[1.25rem] text-center',
                    activeTab === tab.key ? 'bg-[#4E2DD2]/10 text-[#4E2DD2]' : 'bg-gray-100 text-gray-500'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'consultas' && (
            <ConsultasTab
              patientId={id}
              patient={patient}
              notes={timeline?.notes ?? []}
              onRefresh={loadTimeline}
            />
          )}
          {activeTab === 'recetas' && (
            <PrescriptionsTab
              patientId={id}
              patientName={`${patient.firstName} ${patient.lastName}`}
              prescriptions={timeline?.prescriptions ?? []}
              onRefresh={loadTimeline}
            />
          )}
          {activeTab === 'lab' && (
            <LabTab patientId={id} results={timeline?.labResults ?? []} onRefresh={loadTimeline} />
          )}
        </div>
      </div>

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
