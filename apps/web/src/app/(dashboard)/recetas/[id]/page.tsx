'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'

export default function PrescriptionPrintPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [rx, setRx] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.prescriptions.get(id)
      .then((res: any) => setRx(res.data))
      .catch(() => router.push('/recetas'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!rx) return null

  const doctor = rx.doctor
  const patient = rx.patient
  const clinic = rx.clinic

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-medium text-gray-700">
          Receta — {patient?.firstName} {patient?.lastName}
        </span>
        <div className="ml-auto">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* Prescription document */}
      <div className="flex-1 overflow-auto bg-gray-100 print:bg-white p-6 print:p-0">
        <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none print:max-w-none">
          <div className="p-10 print:p-8" style={{ fontFamily: 'Georgia, serif', minHeight: '297mm' }}>

            {/* Header */}
            <div className="border-b-2 border-blue-700 pb-4 mb-6 flex justify-between items-start">
              <div>
                <p className="text-xl font-bold text-blue-700">{clinic?.name ?? 'Clínica Médica'}</p>
                {clinic?.address && <p className="text-xs text-gray-500 mt-0.5">{clinic.address}{clinic.city ? `, ${clinic.city}` : ''}</p>}
                {clinic?.phone && <p className="text-xs text-gray-500">{clinic.phone}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Receta Médica</p>
                <p className="text-sm text-gray-700 mt-1">Fecha: {formatDate(rx.createdAt, 'dd MMM yyyy')}</p>
                {rx.followUpDate && (
                  <p className="text-xs text-gray-500 mt-0.5">Seguimiento: {formatDate(rx.followUpDate, 'dd MMM yyyy')}</p>
                )}
              </div>
            </div>

            {/* Doctor info */}
            <div className="mb-5">
              <p className="text-base font-bold text-gray-900">
                Dr. {doctor?.firstName} {doctor?.lastName}
              </p>
              {doctor?.specialty && <p className="text-sm text-gray-600">{doctor.specialty}</p>}
              {doctor?.licenseNumber && (
                <p className="text-xs text-gray-500">Cédula Profesional: {doctor.licenseNumber}</p>
              )}
              {doctor?.institution && (
                <p className="text-xs text-gray-500">{doctor.institution}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-4" />

            {/* Patient info */}
            <div className="mb-6 bg-gray-50 rounded-lg p-3 print:bg-transparent print:border print:border-gray-200">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Paciente</p>
              <p className="text-base font-semibold text-gray-900">
                {patient?.firstName} {patient?.lastName}
              </p>
              <div className="flex gap-6 mt-1 text-xs text-gray-500">
                {patient?.dateOfBirth && <span>Nacimiento: {formatDate(patient.dateOfBirth, 'dd MMM yyyy')}</span>}
                {patient?.phone && <span>Tel: {patient.phone}</span>}
                {patient?.curp && <span>CURP: {patient.curp}</span>}
              </div>
            </div>

            {/* Rx symbol + medications */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-bold italic text-blue-700">℞</span>
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Prescripción</span>
              </div>

              <div className="space-y-4">
                {rx.items?.map((item: any, i: number) => (
                  <div key={i} className="pl-4 border-l-2 border-blue-400">
                    <p className="text-base font-bold text-gray-900">
                      {i + 1}. {item.medicationName} {item.dose}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Vía {item.route} · {item.frequency} · Duración: {item.duration}
                    </p>
                    {item.quantity && (
                      <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                    )}
                    {item.instructions && (
                      <p className="text-sm text-gray-500 italic">Indicaciones: {item.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* General instructions */}
            {rx.instructions && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Indicaciones generales</p>
                <p className="text-sm text-gray-700 leading-relaxed">{rx.instructions}</p>
              </div>
            )}

            {/* Follow-up */}
            {rx.followUpDate && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Cita de seguimiento</p>
                <p className="text-sm text-gray-700">{formatDate(rx.followUpDate, "EEEE d 'de' MMMM 'de' yyyy")}</p>
              </div>
            )}

            {/* Signature area */}
            <div className="mt-16 flex justify-end">
              <div className="text-center w-56">
                <div className="border-t border-gray-800 pt-2">
                  <p className="text-sm font-medium text-gray-900">
                    Dr. {doctor?.firstName} {doctor?.lastName}
                  </p>
                  {doctor?.licenseNumber && (
                    <p className="text-xs text-gray-500">Cédula: {doctor.licenseNumber}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-3 border-t border-gray-200 flex justify-between text-xs text-gray-300">
              <span>Documento confidencial — solo para uso del paciente indicado</span>
              <span>ID: {rx.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: Letter; margin: 0; }
          body { -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </>
  )
}
