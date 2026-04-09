'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Plus, FileText, MessageCircle, Loader2, Pencil, Printer, Calendar, User } from 'lucide-react'
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

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:    'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-red-100 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activa', COMPLETED: 'Completada', CANCELLED: 'Cancelada',
}

export default function RecetasPage() {
  const router = useRouter()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRx, setEditingRx] = useState<EditingRx | null>(null)
  const [waLoading, setWaLoading] = useState<string | null>(null)

  function openEdit(rx: Prescription) {
    setEditingRx({
      id: rx.id,
      patientId: (rx.patient as any)?.id ?? '',
      patientName: `${rx.patient?.firstName ?? ''} ${rx.patient?.lastName ?? ''}`.trim(),
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
      followUpDate: rx.followUpDate
        ? new Date(rx.followUpDate).toISOString().split('T')[0]!
        : '',
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

  async function handleSendWhatsApp(rxId: string) {
    setWaLoading(rxId)
    try {
      await api.prescriptions.sendWhatsApp(rxId)
      await load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
    finally { setWaLoading(null) }
  }

  return (
    <>
      <Header
        title="Recetas"
        subtitle="Prescripciones médicas digitales"
        actions={
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
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
            <p className="text-sm font-medium">No hay recetas registradas</p>
            <p className="text-xs mt-1">Crea la primera receta con el botón superior</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {prescriptions.map((rx) => (
              <div key={rx.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {rx.patient?.firstName} {rx.patient?.lastName}
                      </p>
                      <p className="text-xs text-gray-400">
                        Dr. {rx.doctor?.firstName} {rx.doctor?.lastName} · {formatDate(rx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rx.sentViaWhatsApp && (
                      <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                        ✓ Enviada
                      </span>
                    )}
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_STYLE[rx.status] ?? STATUS_STYLE['ACTIVE']}`}>
                      {STATUS_LABEL[rx.status] ?? rx.status}
                    </span>
                  </div>
                </div>

                {/* Medications */}
                <div className="px-5 py-4">
                  <div className="space-y-2">
                    {rx.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <span className="text-sm font-semibold text-gray-900">{item.medicationName}</span>
                          <span className="text-sm text-gray-500"> {item.dose}</span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.route} · {item.frequency} · {item.duration}
                            {item.instructions && ` · ${item.instructions}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {rx.instructions && (
                    <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 italic">
                      {rx.instructions}
                    </p>
                  )}

                  {rx.followUpDate && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs text-gray-500">
                        Seguimiento: <span className="font-medium text-gray-700">{formatDate(rx.followUpDate)}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions footer */}
                <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
                  {/* Print / PDF */}
                  <button
                    onClick={() => router.push(`/recetas/${rx.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-white transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Ver / Imprimir
                  </button>

                  {/* Edit — only active */}
                  {rx.status === 'ACTIVE' && (
                    <button
                      onClick={() => openEdit(rx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-white transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                  )}

                  {/* WhatsApp — spacer then green */}
                  <div className="ml-auto">
                    {!rx.sentViaWhatsApp && (
                      <button
                        onClick={() => handleSendWhatsApp(rx.id)}
                        disabled={waLoading === rx.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        {waLoading === rx.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <MessageCircle className="w-3.5 h-3.5" />
                        }
                        Enviar WhatsApp
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
