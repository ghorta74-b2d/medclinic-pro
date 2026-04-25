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
  ACTIVE:    'bg-success/15 text-success',
  COMPLETED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/15 text-destructive',
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
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva receta
          </button>
        }
      />

      <div className="flex-1 p-3 sm:p-6 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No hay recetas registradas</p>
            <p className="text-xs mt-1">Crea la primera receta con el botón superior</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {prescriptions.map((rx) => (
              <div key={rx.id} className="bg-card rounded-2xl border border-border overflow-hidden hover:border-border transition-colors">
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {rx.patient?.firstName} {rx.patient?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dr. {rx.doctor?.firstName} {rx.doctor?.lastName} · {formatDate(rx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rx.sentViaWhatsApp && (
                      <span className="text-xs bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full font-medium">
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
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <span className="text-sm font-semibold text-foreground">{item.medicationName}</span>
                          <span className="text-sm text-muted-foreground"> {item.dose}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.route} · {item.frequency} · {item.duration}
                            {item.instructions && ` · ${item.instructions}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {rx.instructions && (
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border italic">
                      {rx.instructions}
                    </p>
                  )}

                  {rx.followUpDate && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Seguimiento: <span className="font-medium text-foreground/80">{formatDate(rx.followUpDate)}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions footer */}
                <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-muted">
                  {/* Print / PDF */}
                  <button
                    onClick={() => router.push(`/recetas/${rx.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground/80 hover:bg-card transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Ver / Imprimir
                  </button>

                  {/* Edit — only active */}
                  {rx.status === 'ACTIVE' && (
                    <button
                      onClick={() => openEdit(rx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground/80 hover:bg-card transition-colors"
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
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-success hover:bg-success/90 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
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
