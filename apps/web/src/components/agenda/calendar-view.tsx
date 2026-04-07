'use client'

import { formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { STATUS_LABELS, STATUS_COLORS } from 'medclinic-shared'
import type { Appointment, AppointmentStatus } from 'medclinic-shared'
import { useRouter } from 'next/navigation'

const STATUS_BG: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-blue-50 border-blue-200 text-blue-900',
  CONFIRMED: 'bg-green-50 border-green-200 text-green-900',
  CHECKED_IN: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  IN_PROGRESS: 'bg-orange-50 border-orange-200 text-orange-900',
  COMPLETED: 'bg-gray-50 border-gray-200 text-gray-700',
  CANCELLED: 'bg-red-50 border-red-200 text-red-900 opacity-60',
  NO_SHOW: 'bg-red-50 border-red-200 text-red-900 opacity-60',
}

interface AppointmentCalendarProps {
  appointments: Appointment[]
  loading: boolean
  selectedDate: Date
  onRefresh: () => void
}

// Generate time slots from 07:00 to 22:00
const TIME_SLOTS = Array.from({ length: 30 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

export function AppointmentCalendar({
  appointments,
  loading,
  onRefresh,
}: AppointmentCalendarProps) {
  const router = useRouter()

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeAppointments = appointments.filter(
    (a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW'
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          {activeAppointments.length} cita{activeAppointments.length !== 1 ? 's' : ''}
        </h2>
        <button
          onClick={onRefresh}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Actualizar
        </button>
      </div>

      {activeAppointments.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-500 text-sm">No hay citas para este día</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {activeAppointments
            .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
            .map((appointment) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                onClick={() => router.push(`/agenda/${appointment.id}`)}
              />
            ))}
        </div>
      )}
    </div>
  )
}

function AppointmentRow({
  appointment,
  onClick,
}: {
  appointment: Appointment
  onClick: () => void
}) {
  const status = appointment.status as AppointmentStatus
  const typeColor = appointment.appointmentType?.color ?? '#3B82F6'

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex items-start gap-4 hover:bg-gray-50 transition-colors text-left"
    >
      {/* Time */}
      <div className="shrink-0 w-16 text-right">
        <p className="text-sm font-semibold text-gray-900">{formatTime(appointment.startsAt)}</p>
        <p className="text-xs text-gray-400">{formatTime(appointment.endsAt)}</p>
      </div>

      {/* Color bar */}
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: typeColor }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {appointment.patient
              ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
              : 'Paciente'}
          </p>
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
            STATUS_BG[status]
          )}>
            {STATUS_LABELS[status]}
          </span>
        </div>
        {appointment.appointmentType && (
          <p className="text-xs text-gray-500 mt-0.5">{appointment.appointmentType.name}</p>
        )}
        {appointment.chiefComplaint && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{appointment.chiefComplaint}</p>
        )}
      </div>

      {/* Doctor */}
      {appointment.doctor && (
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-500">
            Dr. {appointment.doctor.lastName}
          </p>
        </div>
      )}
    </button>
  )
}
