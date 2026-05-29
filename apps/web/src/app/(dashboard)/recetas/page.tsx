'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { Plus, FileText } from 'lucide-react'
import type { Prescription } from 'medclinic-shared'
import { PrescriptionBuilder } from '@/components/prescriptions/prescription-builder'
import { PrescriptionCard } from '@/components/prescriptions/prescription-card'
import { EcgLoader } from '@/components/ui/ecg-loader'

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
          <div className="py-12"><EcgLoader label="Cargando recetas…" /></div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No hay recetas registradas</p>
            <p className="text-xs mt-1">Crea la primera receta con el botón superior</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {prescriptions.map((rx) => (
              <PrescriptionCard
                key={rx.id}
                prescription={rx}
                onChanged={load}
                onEdit={openEdit}
                showPatientName
              />
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
