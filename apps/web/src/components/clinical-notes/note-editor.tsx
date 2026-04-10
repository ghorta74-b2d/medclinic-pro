'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { searchCie10, type Cie10Entry } from 'medclinic-shared'
import { cn } from '@/lib/utils'
import { Plus, X, Search, CheckCircle2, Loader2 } from 'lucide-react'
import type { Patient } from 'medclinic-shared'

interface VitalSignsForm {
  weightKg: string
  heightCm: string
  systolicBp: string
  diastolicBp: string
  heartRateBpm: string
  temperatureC: string
  spo2Percent: string
  glucoseMgDl: string
}

interface Diagnosis {
  code: string
  description: string
  type: 'PRIMARY' | 'SECONDARY' | 'RULE_OUT'
}

interface NoteEditorProps {
  patientId: string
  appointmentId?: string
  patient: Patient | null
  onSaved: (noteId: string) => void
}

export function ClinicalNoteEditor({ patientId, appointmentId, patient, onSaved }: NoteEditorProps) {
  const [saving, setSaving] = useState(false)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState('')
  const [noteId, setNoteId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Clinical fields
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [physicalExam, setPhysicalExam] = useState('')
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [diagSearch, setDiagSearch] = useState('')
  const [diagResults, setDiagResults] = useState<Cie10Entry[]>([])
  const [treatmentPlan, setTreatmentPlan] = useState('')
  const [evolutionNotes, setEvolutionNotes] = useState('')
  const [vitals, setVitals] = useState<VitalSignsForm>({
    weightKg: '', heightCm: '', systolicBp: '', diastolicBp: '',
    heartRateBpm: '', temperatureC: '', spo2Percent: '', glucoseMgDl: '',
  })

  function handleDiagSearch(q: string) {
    setDiagSearch(q)
    if (q.length >= 2) {
      setDiagResults(searchCie10(q))
    } else {
      setDiagResults([])
    }
  }

  function addDiagnosis(entry: Cie10Entry) {
    if (diagnoses.some((d) => d.code === entry.code)) return
    const type: Diagnosis['type'] = diagnoses.length === 0 ? 'PRIMARY' : 'SECONDARY'
    setDiagnoses([...diagnoses, { code: entry.code, description: entry.description, type }])
    setDiagSearch('')
    setDiagResults([])
  }

  function removeDiagnosis(code: string) {
    setDiagnoses(diagnoses.filter((d) => d.code !== code))
  }

  function buildPayload() {
    const v = vitals
    const hasVitals = Object.values(v).some((x) => x !== '')

    return {
      patientId,
      appointmentId,
      chiefComplaint: chiefComplaint || undefined,
      physicalExam: physicalExam || undefined,
      diagnoses,
      treatmentPlan: treatmentPlan || undefined,
      evolutionNotes: evolutionNotes || undefined,
      vitalSigns: hasVitals ? {
        weightKg: v.weightKg ? parseFloat(v.weightKg) : undefined,
        heightCm: v.heightCm ? parseFloat(v.heightCm) : undefined,
        systolicBp: v.systolicBp ? parseInt(v.systolicBp) : undefined,
        diastolicBp: v.diastolicBp ? parseInt(v.diastolicBp) : undefined,
        heartRateBpm: v.heartRateBpm ? parseInt(v.heartRateBpm) : undefined,
        temperatureC: v.temperatureC ? parseFloat(v.temperatureC) : undefined,
        spo2Percent: v.spo2Percent ? parseInt(v.spo2Percent) : undefined,
        glucoseMgDl: v.glucoseMgDl ? parseInt(v.glucoseMgDl) : undefined,
      } : undefined,
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      if (noteId) {
        await api.clinicalNotes.update(noteId, buildPayload())
      } else {
        const res = await api.clinicalNotes.create(buildPayload()) as { data: { id: string } }
        setNoteId(res.data.id)
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleSign() {
    setSigning(true)
    setError('')
    try {
      let id = noteId
      if (!id) {
        const res = await api.clinicalNotes.create(buildPayload()) as { data: { id: string } }
        id = res.data.id
        setNoteId(id)
      } else {
        await api.clinicalNotes.update(id, buildPayload())
      }
      await api.clinicalNotes.sign(id)
      onSaved(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al firmar')
    } finally {
      setSigning(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide'
  const sectionClass = 'bg-white rounded-xl border border-gray-300 shadow-sm p-5'

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Patient allergies warning */}
      {patient && patient.allergies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <X className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-800">
            <strong>Alergias del paciente:</strong> {patient.allergies.join(', ')}
          </p>
        </div>
      )}

      {/* Chief complaint */}
      <div className={sectionClass}>
        <label className={labelClass}>Motivo de consulta</label>
        <textarea
          rows={2}
          value={chiefComplaint}
          onChange={(e) => setChiefComplaint(e.target.value)}
          placeholder="¿Por qué consulta el paciente hoy?"
          className={inputClass}
        />
      </div>

      {/* Vital signs */}
      <div className={sectionClass}>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Signos vitales</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'weightKg', label: 'Peso (kg)', placeholder: '65.5' },
            { key: 'heightCm', label: 'Talla (cm)', placeholder: '165' },
            { key: 'systolicBp', label: 'TA sistólica', placeholder: '120' },
            { key: 'diastolicBp', label: 'TA diastólica', placeholder: '80' },
            { key: 'heartRateBpm', label: 'FC (lpm)', placeholder: '72' },
            { key: 'temperatureC', label: 'Temperatura (°C)', placeholder: '36.5' },
            { key: 'spo2Percent', label: 'SpO₂ (%)', placeholder: '98' },
            { key: 'glucoseMgDl', label: 'Glucosa (mg/dL)', placeholder: '95' },
          ].map((field) => (
            <div key={field.key}>
              <label className={labelClass}>{field.label}</label>
              <input
                type="number"
                step="any"
                placeholder={field.placeholder}
                value={vitals[field.key as keyof VitalSignsForm]}
                onChange={(e) => setVitals((v) => ({ ...v, [field.key]: e.target.value }))}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Physical exam */}
      <div className={sectionClass}>
        <label className={labelClass}>Exploración física</label>
        <textarea
          rows={4}
          value={physicalExam}
          onChange={(e) => setPhysicalExam(e.target.value)}
          placeholder="Hallazgos de la exploración física..."
          className={inputClass}
        />
      </div>

      {/* Diagnoses — CIE-10 */}
      <div className={sectionClass}>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Diagnósticos (CIE-10)</h3>

        {/* Selected */}
        {diagnoses.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {diagnoses.map((d) => (
              <div key={d.code} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                <span className="text-xs font-bold text-blue-700">{d.code}</span>
                <span className="text-xs text-blue-800">{d.description}</span>
                <select
                  value={d.type}
                  onChange={(e) => setDiagnoses(diagnoses.map((x) =>
                    x.code === d.code ? { ...x, type: e.target.value as Diagnosis['type'] } : x
                  ))}
                  className="text-xs border-none bg-transparent text-blue-600 outline-none"
                >
                  <option value="PRIMARY">Principal</option>
                  <option value="SECONDARY">Secundario</option>
                  <option value="RULE_OUT">A descartar</option>
                </select>
                <button onClick={() => removeDiagnosis(d.code)} className="text-blue-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar código CIE-10 o descripción..."
            value={diagSearch}
            onChange={(e) => handleDiagSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {diagResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {diagResults.map((entry) => (
                <button
                  key={entry.code}
                  type="button"
                  onClick={() => addDiagnosis(entry)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3"
                >
                  <span className="font-mono text-xs text-blue-600 w-16 shrink-0">{entry.code}</span>
                  <span className="text-gray-800">{entry.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Treatment plan */}
      <div className={sectionClass}>
        <label className={labelClass}>Plan de tratamiento</label>
        <textarea
          rows={4}
          value={treatmentPlan}
          onChange={(e) => setTreatmentPlan(e.target.value)}
          placeholder="Indicaciones, estudios solicitados, interconsultas..."
          className={inputClass}
        />
      </div>

      {/* Evolution notes */}
      <div className={sectionClass}>
        <label className={labelClass}>Notas de evolución</label>
        <textarea
          rows={3}
          value={evolutionNotes}
          onChange={(e) => setEvolutionNotes(e.target.value)}
          placeholder="Evolución del padecimiento, respuesta al tratamiento previo..."
          className={inputClass}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 pb-6">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || signing}
            className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {saved
              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
              : saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : null}
            {saving ? 'Guardando...' : saved ? 'Borrador guardado' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            onClick={handleSign}
            disabled={signing || saving}
            className="flex-1 py-2.5 bg-[#4E2DD2] hover:bg-[#3d22a8] disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {signing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Firmando...</>
              : <><CheckCircle2 className="w-4 h-4" /> Firmar nota</>}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center">
          <strong>Guardar borrador</strong> guarda sin finalizar · <strong>Firmar nota</strong> guarda y cierra la consulta (no editable después)
        </p>
      </div>
    </div>
  )
}
