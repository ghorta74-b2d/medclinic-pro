'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { X, Upload, Link } from 'lucide-react'
import type { Patient } from 'medclinic-shared'

interface NewLabResultDialogProps {
  onClose: () => void
  onCreated: () => void
  patientId?: string
}

export function NewLabResultDialog({ onClose, onCreated, patientId: defaultPatientId }: NewLabResultDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState(defaultPatientId ?? '')
  const [selectedPatientName, setSelectedPatientName] = useState('')
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url')
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [createdResultId, setCreatedResultId] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    category: 'LABORATORY',
    laboratoryName: '',
    orderedAt: '',
    collectedAt: '',
    reportedAt: '',
    externalUrl: '',
    notes: '',
  })

  useEffect(() => {
    if (patientSearch.length >= 2) {
      api.patients.list({ q: patientSearch, limit: '8' })
        .then((res) => setPatients((res as { data: Patient[] }).data))
        .catch(() => {})
    } else {
      setPatients([])
    }
  }, [patientSearch])

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatientId) { setError('Seleccione un paciente'); return }
    if (!form.title) { setError('El título es requerido'); return }

    setLoading(true)
    setError('')

    try {
      const res = await api.labResults.create({
        patientId: selectedPatientId,
        title: form.title,
        category: form.category,
        laboratoryName: form.laboratoryName || undefined,
        orderedAt: form.orderedAt ? new Date(form.orderedAt).toISOString() : undefined,
        collectedAt: form.collectedAt ? new Date(form.collectedAt).toISOString() : undefined,
        reportedAt: form.reportedAt ? new Date(form.reportedAt).toISOString() : undefined,
        externalUrl: uploadMode === 'url' && form.externalUrl ? form.externalUrl : undefined,
        notes: form.notes || undefined,
      }) as { data: { id: string } }

      // If file mode, upload the file now
      if (uploadMode === 'file' && fileToUpload) {
        const formData = new FormData()
        formData.append('file', fileToUpload)

        // Use raw fetch for multipart
        const token = null // get from supabase session in real app
        await fetch(`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/lab-results/${res.data.id}/upload`, {
          method: 'POST',
          body: formData,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
      }

      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar resultado')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Agregar resultado de laboratorio</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Patient */}
          {!defaultPatientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
              {selectedPatientId ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-green-800">{selectedPatientName}</span>
                  <button type="button" onClick={() => { setSelectedPatientId(''); setSelectedPatientName('') }}
                    className="ml-auto"><X className="w-3.5 h-3.5 text-green-600" /></button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" placeholder="Buscar paciente..." value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)} className={inputClass} />
                  {patients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      {patients.map((p) => (
                        <button key={p.id} type="button"
                          onClick={() => { setSelectedPatientId(p.id); setSelectedPatientName(`${p.firstName} ${p.lastName}`); setPatientSearch(''); setPatients([]) }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex justify-between">
                          <span>{p.firstName} {p.lastName}</span>
                          <span className="text-gray-400 text-xs">{p.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título del estudio *</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="Biometría hemática, Ultrasonido pélvico..." className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputClass}>
                <option value="LABORATORY">Laboratorio</option>
                <option value="IMAGING">Imagenología</option>
                <option value="PATHOLOGY">Patología</option>
                <option value="CARDIOLOGY">Cardiología</option>
                <option value="ENDOSCOPY">Endoscopía</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Laboratorio</label>
              <input value={form.laboratoryName} onChange={(e) => set('laboratoryName', e.target.value)}
                placeholder="Ej. Laboratorio ABC" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de solicitud</label>
              <input type="date" value={form.orderedAt} onChange={(e) => set('orderedAt', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de resultado</label>
              <input type="date" value={form.reportedAt} onChange={(e) => set('reportedAt', e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* File or URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Archivo de resultado</label>
            <div className="flex gap-2 mb-3">
              <button type="button" onClick={() => setUploadMode('url')}
                className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2',
                  uploadMode === 'url' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600')}>
                <Link className="w-4 h-4" /> URL externa
              </button>
              <button type="button" onClick={() => setUploadMode('file')}
                className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2',
                  uploadMode === 'file' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600')}>
                <Upload className="w-4 h-4" /> Subir PDF
              </button>
            </div>

            {uploadMode === 'url' ? (
              <input type="url" value={form.externalUrl} onChange={(e) => set('externalUrl', e.target.value)}
                placeholder="https://portal.laboratorio.com/resultado/..." className={inputClass} />
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input type="file" accept=".pdf,image/*" id="lab-file"
                  onChange={(e) => setFileToUpload(e.target.files?.[0] ?? null)} className="hidden" />
                <label htmlFor="lab-file" className="cursor-pointer">
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {fileToUpload ? fileToUpload.name : 'Clic para seleccionar PDF o imagen'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Máximo 50MB</p>
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas del médico</label>
            <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="Observaciones sobre los resultados..." className={inputClass} />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {loading ? 'Guardando...' : 'Guardar resultado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
