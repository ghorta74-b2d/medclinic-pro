'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/utils'
import { STATUS_LABELS } from 'medclinic-shared'
import type { Appointment, AppointmentStatus } from 'medclinic-shared'

interface WeekViewProps {
  appointments: Appointment[]
  loading: boolean
  referenceDate: Date
  onDayClick: (date: Date) => void
  onRefresh: () => void
}

const STATUS_DOT: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-primary',
  CONFIRMED: 'bg-success',
  CHECKED_IN: 'bg-warning',
  IN_PROGRESS: 'bg-warning',
  COMPLETED: 'bg-muted-foreground/60',
  CANCELLED: 'bg-destructive/70',
  NO_SHOW: 'bg-destructive/70',
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getWeekDays(ref: Date): Date[] {
  const start = new Date(ref)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function WeekView({ appointments, loading, referenceDate, onDayClick }: WeekViewProps) {
  const router = useRouter()
  const days = getWeekDays(referenceDate)
  const todayStr = new Date().toLocaleDateString('sv-SE')

  const apptsByDay: Record<string, Appointment[]> = {}
  for (const day of days) {
    const key = day.toLocaleDateString('sv-SE')
    apptsByDay[key] = []
  }
  for (const apt of appointments) {
    const key = new Date(apt.startsAt).toLocaleDateString('sv-SE')
    if (apptsByDay[key]) apptsByDay[key]!.push(apt)
  }

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {days.map((day, i) => {
          const key = day.toLocaleDateString('sv-SE')
          const isToday = key === todayStr
          const dayApts = apptsByDay[key] ?? []
          return (
            <button
              key={key}
              onClick={() => onDayClick(day)}
              className={cn(
                'px-2 py-3 text-center hover:bg-muted/50 transition-colors border-r border-border last:border-r-0',
                isToday && 'bg-primary/10'
              )}
            >
              <p className="text-xs text-muted-foreground font-medium">{DAY_LABELS[i]}</p>
              <p className={cn(
                'text-lg font-bold mt-0.5',
                isToday ? 'text-primary' : 'text-foreground'
              )}>
                {day.getDate()}
              </p>
              {dayApts.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">{dayApts.length} cita{dayApts.length !== 1 ? 's' : ''}</p>
              )}
            </button>
          )
        })}
      </div>

      {/* Appointment rows */}
      <div className="grid grid-cols-7 min-h-[400px]">
        {days.map((day) => {
          const key = day.toLocaleDateString('sv-SE')
          const dayApts = (apptsByDay[key] ?? []).sort(
            (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
          ).filter(a => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW')

          return (
            <div
              key={key}
              className="border-r border-border last:border-r-0 p-2 space-y-1.5 min-h-[400px]"
            >
              {dayApts.map((apt) => {
                const status = apt.status as AppointmentStatus
                const typeColor = apt.appointmentType?.color ?? '#3B82F6'
                return (
                  <button
                    key={apt.id}
                    onClick={() => router.push(`/agenda/${apt.id}`)}
                    className="w-full rounded-lg p-2 text-left border border-border hover:border-primary/50 hover:bg-primary/10/40 active:scale-[0.98] transition-all cursor-pointer"
                    style={{ borderLeftColor: typeColor, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[status])} />
                      <p className="text-xs font-semibold text-foreground/80">{formatTime(apt.startsAt)}</p>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">
                      {apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Paciente'}
                    </p>
                    {apt.appointmentType && (
                      <p className="text-xs text-muted-foreground truncate">{apt.appointmentType.name}</p>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
