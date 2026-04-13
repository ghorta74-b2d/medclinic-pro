'use client'

import { useState, useEffect } from 'react'
import { api, getUserRole } from '@/lib/api'
import { X, Plus, Trash2, Banknote, CreditCard, ArrowLeftRight, Clock, Building2, Stethoscope } from 'lucide-react'
import type { Patient, Service } from 'medclinic-shared'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Doctor { id: string; firstName: string; lastName: string; specialty?: string }

interface NewInvoiceDialogProps {
  onClose: () => void
  onCreated: () => void
}

interface LineItem {
  serviceId: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number        // 0 or 0.16
  saveToCatalog: boolean // only relevant when serviceId === ''
}

type PayMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'INSURANCE' | ''

const MEXICO_INSURERS = [
  'AXA Seguros',
  'GNP Seguros',
  'Mapfre',
  'MetLife',
  'BBVA Seguros',
  'Seguros Monterrey NY Life',
  'Allianz',
  'Zurich',
  'Cigna',
  'Bupa',
  'SURA',
  'HDI Seguros',
  'Banorte Seguros',
  'Inbursa Seguros',
  'Seguros Atlas',
  'Otro',
]

const emptyLine = (): LineItem => ({
  serviceId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0, saveToCatalog: false,
})

const PAYMENT_OPTIONS: { value: PayMethod; label: string; desc: string; icon: React.ElementType }[] = [
  { value: '',          label: 'Sin cobro',  desc: 'Queda pendiente', icon: Clock },
  { value: 'CASH',      label: 'Efectivo',   desc: '',               icon: Banknote },
  { value: 'CARD',      label: 'Tarjeta',    desc: 'Créd / Déb',     icon: CreditCard },
  { value: 'TRANSFER',  label: 'SPEI',       desc: 'Transferencia',  icon: ArrowLeftRight },
  { value: 'INSURANCE', label: 'Seguro',     desc: 'Aseguradora',    icon: Building2 },
]

const REF_PLACEHOLDER: Record<string, string> = {
  CASH:     'Número de recibo (opcional)',
  CARD:     'Últimos 4 dígitos o autorización',
  TRANSFER: 'Número de operación SPEI',
}

export function NewInvoiceDialog({ onClose, onCreated }: NewInvoiceDialogProps) {
  const [services, setServices] = useState<Service[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedPatientName, setSelectedPatientName] = useState('')
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])
  const [notes, setNotes] = useState('')
  const [payMethod, setPayMethod] = useState<PayMethod>('')
  const [payReference, setPayReference] = useState('')
  const [insurerName, setInsurerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Doctor selector — shown for ADMIN and STAFF, hidden for DOCTOR (auto-assigned server-side)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')

  useEffect(() => {
    api.billing.services()
      .then((res) => setServices((res as { data: Service[] }).data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    async function initRole() {
      try {
        const role = await getUserRole()
        setUserRole(role)
        if (role !== 'DOCTOR') {
          const res = await api.configuracion.doctors() as { data: Doctor[] }
          const list = res.data ?? []
          setDoctors(list)
          // Pre-select first doctor if only one available
          if (list.length === 1 && list[0]) setSelectedDoctorId(list[0].id)
        }
      } catch { /* sin bloquear el dialog */ }
    }
    initRole()
  }, [])

  useEffect(() => {
    if (patientSearch.length >= 2) {
      api.patients.list({ q: patientSearch, limit: '8' })
        .then((res) => setPatients((res as { data: Patient[] }).data))
        .catch(() => {})
    } else {
      setPatients([])
    }
  }, [patientSearch])

  function selectService(idx: number, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId)
    setLines((prev) => {
      const n = [...prev]
      n[idx] = {
        ...n[idx]!,
        serviceId,
        description: svc?.name ?? '',
        unitPrice: svc ? Number(svc.price) : 0,
        taxRate: svc ? Number(svc.taxRate) : 0,
        saveToCatalog: false,
      }
      return n
    })
  }

  function updateLine<K extends keyof LineItem>(idx: number, field: K, value: LineItem[K]) {
    setLines((prev) => {
      const n = [...prev]
      n[idx] = { ...n[idx]!, [field]: value }
      return n
    })
  }

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  const taxTotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice * l.taxRate, 0)
  const total = subtotal + taxTotal

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatientId) { setError('Seleccione un paciente'); return }
    // ADMIN / STAFF must assign the invoice to a doctor
    if (userRole !== 'DOCTOR' && !selectedDoctorId) {
      setError('Seleccione el médico al que pertenece esta factura')
      return
    }
    const validLines = lines.filter((l) => l.description && l.unitPrice > 0)
    if (validLines.length === 0) { setError('Agregue al menos un concepto con precio'); return }

    setLoading(true)
    setError('')
    try {
      // Save free-text lines marked for catalog before submitting invoice
      const resolvedLines = await Promise.all(
        validLines.map(async (line) => {
          if (!line.serviceId && line.saveToCatalog && line.description) {
            try {
              const svcRes = await api.billing.createService({
                name: line.description,
                price: line.unitPrice,
                taxRate: line.taxRate,
              }) as { data: { id: string } }
              return { ...line, serviceId: svcRes.data.id }
            } catch {
              return line
            }
          }
          return line
        })
      )

      await api.billing.createInvoice({
        patientId: selectedPatientId,
        localDate: new Date().toLocaleDateString('sv-SE'),
        // Pass doctorId for ADMIN/STAFF — DOCTOR auto-assigned server-side
        ...(userRole !== 'DOCTOR' && selectedDoctorId ? { doctorId: selectedDoctorId } : {}),
        items: resolvedLines.map((l) => ({
          serviceId: l.serviceId || undefined,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
        })),
        notes: notes || undefined,
        ...(payMethod ? {
          payment: {
            method: payMethod,
            reference: payReference || undefined,
            insurerName: payMethod === 'INSURANCE' ? insurerName || undefined : undefined,
          },
        } : {}),
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear factura')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nueva factura</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Patient */}
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

          {/* Doctor selector — ADMIN and STAFF must assign every invoice to a doctor */}
          {userRole !== null && userRole !== 'DOCTOR' && doctors.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                  Médico responsable *
                </span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {doctors.map(d => (
                  <button key={d.id} type="button"
                    onClick={() => setSelectedDoctorId(d.id)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all',
                      selectedDoctorId === d.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}>
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      selectedDoctorId === d.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    )}>
                      {d.firstName[0]}{d.lastName[0]}
                    </div>
                    <div>
                      <p className={cn('text-sm font-medium', selectedDoctorId === d.id ? 'text-blue-900' : 'text-gray-800')}>
                        Dr. {d.firstName} {d.lastName}
                      </p>
                      {d.specialty && (
                        <p className="text-xs text-gray-400">{d.specialty}</p>
                      )}
                    </div>
                    {selectedDoctorId === d.id && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-800">Conceptos</label>
              <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Agregar concepto
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                  {/* Row 1: service selector */}
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Servicio / Descripción</label>
                      <select value={line.serviceId}
                        onChange={(e) => selectService(idx, e.target.value)}
                        className={inputClass}>
                        <option value="">— Captura libre —</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    {lines.length > 1 && (
                      <div className="flex items-end pb-0.5">
                        <button type="button" onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-500 p-1.5">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 2: free text (when no service selected) */}
                  {!line.serviceId && (
                    <div className="mb-2">
                      <input value={line.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                        placeholder="Descripción del servicio o concepto..."
                        className={inputClass} />
                      {line.description && (
                        <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                          <input type="checkbox" checked={line.saveToCatalog}
                            onChange={(e) => updateLine(idx, 'saveToCatalog', e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                          <span className="text-xs text-gray-500">Guardar en catálogo de servicios</span>
                        </label>
                      )}
                    </div>
                  )}

                  {/* Row 3: qty + price + IVA */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Cant.</label>
                      <input type="number" min="1" step="1" value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className={inputClass} />
                    </div>
                    <div className="col-span-5">
                      <label className="block text-xs text-gray-500 mb-1">Precio unit.</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={line.unitPrice === 0 ? '' : line.unitPrice}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '')
                            const parts = raw.split('.')
                            const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw
                            updateLine(idx, 'unitPrice', cleaned === '' ? 0 : parseFloat(cleaned) || 0)
                          }}
                          className={`${inputClass} pl-7`}
                        />
                      </div>
                    </div>
                    <div className="col-span-5">
                      <label className="block text-xs text-gray-500 mb-1">IVA</label>
                      <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
                        <button type="button"
                          onClick={() => updateLine(idx, 'taxRate', 0)}
                          className={cn('flex-1 py-2 text-center font-medium transition-colors',
                            line.taxRate === 0
                              ? 'bg-gray-700 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-50')}>
                          No
                        </button>
                        <button type="button"
                          onClick={() => updateLine(idx, 'taxRate', 0.16)}
                          className={cn('flex-1 py-2 text-center font-medium transition-colors',
                            line.taxRate === 0.16
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-50')}>
                          16%
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subtotal row */}
                  {line.unitPrice > 0 && (
                    <div className="text-right text-xs text-gray-400 mt-1.5">
                      {line.taxRate > 0
                        ? `$${(line.quantity * line.unitPrice).toFixed(2)} + IVA $${(line.quantity * line.unitPrice * line.taxRate).toFixed(2)} = ${formatCurrency(line.quantity * line.unitPrice * (1 + line.taxRate))}`
                        : formatCurrency(line.quantity * line.unitPrice)
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total summary */}
            <div className="bg-blue-50 rounded-xl p-4 mt-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              {taxTotal > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IVA</span><span>{formatCurrency(taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-blue-200 pt-2 mt-1">
                <span>Total</span><span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Método de pago</label>
            <div className="grid grid-cols-5 gap-2">
              {PAYMENT_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const active = payMethod === opt.value
                return (
                  <button key={opt.value} type="button"
                    onClick={() => { setPayMethod(opt.value); setPayReference(''); setInsurerName('') }}
                    className={cn(
                      'p-3 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-1',
                      active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    )}>
                    <Icon className={cn('w-5 h-5', active ? 'text-blue-600' : 'text-gray-400')} />
                    <p className={cn('text-xs font-semibold leading-tight', active ? 'text-blue-700' : 'text-gray-600')}>
                      {opt.label}
                    </p>
                    {opt.desc && (
                      <p className="text-[10px] text-gray-400 leading-tight">{opt.desc}</p>
                    )}
                  </button>
                )
              })}
            </div>

            {payMethod === 'INSURANCE' && (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Aseguradora *</label>
                  <select value={insurerName} onChange={(e) => setInsurerName(e.target.value)} className={inputClass}>
                    <option value="">— Seleccionar aseguradora —</option>
                    {MEXICO_INSURERS.map((ins) => (
                      <option key={ins} value={ins}>{ins}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Número de autorización (opcional)</label>
                  <input type="text" value={payReference} onChange={(e) => setPayReference(e.target.value)}
                    placeholder="Número de autorización del seguro" className={inputClass} />
                </div>
              </div>
            )}
            {payMethod !== '' && payMethod !== 'INSURANCE' && (
              <div className="mt-2">
                <label className="block text-xs text-gray-500 mb-1">Referencia (opcional)</label>
                <input
                  type="text"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder={REF_PLACEHOLDER[payMethod] ?? 'Referencia'}
                  className={inputClass}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas opcionales..." className={inputClass} />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {loading ? 'Creando...' : payMethod
                ? `Cobrar · ${formatCurrency(total)}`
                : `Crear factura · ${formatCurrency(total)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
