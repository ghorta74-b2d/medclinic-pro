'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, FileText, MessageCircle, Loader2, Pencil } from 'lucide-react'
import type { Prescription } from 'medclinic-shared'
import { PrescriptionBuilder } from '@/components/prescriptions/prescription-builder'

interface PrescriptionsResponse { data: Prescription[] }

interface EditingRx {
  id: string
  patientId: string
  patientName: string
  items: Array<{ medicationName: string; dose: string; route: string; frequency: string; duration: string; quantity: string; instructions: string }>
  instructions: string
  followUpDate: string
}

export default function RecetasPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRx, setEditingRx] = useState<EditingRx | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({})

  function openEdit(rx: Prescription) {
    setEditingRx({
      id: rx.id,
      patientId: rx.patient?.id ?? '',
      patientName: `${rx.patient?.firstName ?? ''} ${rx.patient?.lastName ?? ''}`.trim(),
      items: (rx.items ?? []).map((it: any) => ({
        medicationName: it.medicationName ?? '',
        dose: it.dose ?? '',
        route: it.route ?? 'oral',
        frequency: it.frequency ?? 'cada 8 horas',
        duration: it.duration ?? '7 días',
        quantity: it.quantity ?? '',
        instructions: it.instructions ?? '',
      })),
      instructions: rx.instructions ?? '',
      followUpDate: rx.followUpDate ? new Date(rx.followUpDate).toISOString().split('T')[0]! : '',
    })
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.prescriptions.list() as PrescriptionsResponse
      setPrescriptions(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleGeneratePdf(rxId: string) {
    setActionLoading((a) => ({ ...a, [rxId]: 'pdf' }))
    try {
      await api.prescriptions.generatePdf(rxId)
      await load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
    finally { setActionLoading((a) => ({ ...a, [rxId]: '' })) }
  }

  async function handleSendWhatsApp(rxId: string) {
    setActionLoading((a) => ({ ...a, [rxId]: 'wa' }))
    try {
      await api.prescriptions.sendWhatsApp(rxId)
      await load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
    finally { setActionLoading((a) => ({ ...a, [rxId]: '' })) }
  }

  return (
    <>
      <Header
        title="Recetas"
        subtitle="Prescripciones médicas digitales"
        actions={
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Nueva receta
          </button>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay recetas registradas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((rx) => (
              <div key={rx.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {rx.patient?.firstName} {rx.patient?.lastName}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        rx.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        rx.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {rx.status === 'ACTIVE' ? 'Activa' : rx.status === 'COMPLETED' ? 'Completada' : 'Cancelada'}
                      </span>
                      {rx.sentViaWhatsApp && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          ✓ Enviada
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Dr. {rx.doctor?.firstName} {rx.doctor?.lastName} · {formatDate(rx.createdAt)}
                      {rx.followUpDate && ` · Seguimiento: ${formatDate(rx.followUpDate)}`}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {rx.items?.map((item, i) => (
                        <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                          {item.medicationName} {item.dose}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0 items-start">
                    {/* Edit button */}
                    {rx.status === 'ACTIVE' && (
                      <button
                        onClick={() => openEdit(rx)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                        title="Editar receta"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    )}
                    {rx.pdfUrl ? (
                      <a
                        href={rx.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Ver PDF
                      </a>
                    ) : (
                      <button
                        onClick={() => handleGeneratePdf(rx.id)}
                        disabled={actionLoading[rx.id] === 'pdf'}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {actionLoading[rx.id] === 'pdf'
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <FileText className="w-3.5 h-3.5" />
                        }
                        Generar PDF
                      </button>
                    )}
                    {rx.pdfUrl && !rx.sentViaWhatsApp && (
                      <button
                        onClick={() => handleSendWhatsApp(rx.id)}
                        disabled={actionLoading[rx.id] === 'wa'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        {actionLoading[rx.id] === 'wa'
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <MessageCircle className="w-3.5 h-3.5" />
                        }
                        WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBuilder && (
        <PrescriptionBuilder
          onClose={() => setShowBuilder(false)}
          onCreated={() => { setShowBuilder(false); load() }}
        />
      )}

      {editingRx && (
        <PrescriptionBuilder
          onClose={() => setEditingRx(null)}
          onCreated={() => { setEditingRx(null); load() }}
          existing={editingRx}
        />
      )}
    </>
  )
}
