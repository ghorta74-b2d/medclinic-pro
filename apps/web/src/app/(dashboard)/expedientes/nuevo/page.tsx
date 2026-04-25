'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { ClinicalNoteEditor } from '@/components/clinical-notes/note-editor'
import { ArrowLeft } from 'lucide-react'
import type { Patient } from 'medclinic-shared'

function NuevoExpedienteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId')
  const appointmentId = searchParams.get('appointmentId')

  const [patient, setPatient] = useState<Patient | null>(null)

  useEffect(() => {
    if (patientId) {
      api.patients.get(patientId)
        .then((res) => setPatient((res as { data: Patient }).data))
        .catch(() => router.push('/pacientes'))
    }
  }, [patientId, router])

  if (!patientId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Debe seleccionar un paciente
      </div>
    )
  }

  return (
    <>
      <Header
        title="Nueva nota clínica"
        subtitle={patient ? `${patient.firstName} ${patient.lastName}` : 'Cargando...'}
        actions={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        }
      />
      <div className="flex-1 p-6 overflow-auto">
        <ClinicalNoteEditor
          patientId={patientId}
          appointmentId={appointmentId ?? undefined}
          patient={patient}
          onSaved={(noteId) => router.push(`/pacientes/${patientId}`)}
        />
      </div>
    </>
  )
}

export default function NuevoExpedientePage() {
  return (
    <Suspense>
      <NuevoExpedienteContent />
    </Suspense>
  )
}
