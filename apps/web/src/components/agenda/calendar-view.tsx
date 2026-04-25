'use client'

import { formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { STATUS_LABELS, STATUS_COLORS } from 'medclinic-shared'
import type { Appointment, AppointmentStatus } from 'medclinic-shared'
import { useRouter } from 'next/navigation'

const STATUS_BG: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-primary/10 border-primary/30 text-primary',
  CONFIRMED: 'bg-success/10 border-success/30 text-success',
  CHECKED_IN: 'bg-warning/10 border-warning/30 text-warning',
  IN_PROGRESS: 'bg-warning/10 border-warning/30 text-warning',
  COMPLETED: 'bg-muted/50 border-border text-foreground/80',
  CANCELLED: 'bg-destructive/10 border-destructive/30 text-destructive opacity-60',
  NO_SHOW: 'bg-destructive/10 border-destructive/30 text-destructive opacity-60',
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
      <div className="bg-card rounded-xl border border-border p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeAppointments = appointments.filter(
    (a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW'
  )

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          {activeAppointments.length} cita{activeAppointments.length !== 1 ? 's' : ''}
        </h2>
        <button
          onClick={onRefresh}
          className="text-xs text-primary hover:text-primary font-medium"
        >
          Actualizar
        </button>
      </div>

      {activeAppointments.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground text-sm">No hay citas para este día</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
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
      className="w-full px-4 py-3 flex items-start gap-4 hover:bg-muted/50 transition-colors text-left"
    >
      {/* Time */}
      <div className="shrink-0 w-16 text-right">
        <p className="text-sm font-semibold text-foreground">{formatTime(appointment.startsAt)}</p>
        <p className="text-xs text-muted-foreground">{formatTime(appointment.endsAt)}</p>
      </div>

      {/* Color bar */}
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: typeColor }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
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
          <p className="text-xs text-muted-foreground mt-0.5">{appointment.appointmentType.name}</p>
        )}
        {appointment.chiefComplaint && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{appointment.chiefComplaint}</p>
        )}
      </div>

      {/* Doctor */}
      {appointment.doctor && (
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">
            Dr. {appointment.doctor.lastName}
          </p>
        </div>
      )}
    </button>
  )
}
