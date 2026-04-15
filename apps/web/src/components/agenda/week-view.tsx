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
  SCHEDULED: 'bg-blue-400',
  CONFIRMED: 'bg-green-400',
  CHECKED_IN: 'bg-yellow-400',
  IN_PROGRESS: 'bg-orange-400',
  COMPLETED: 'bg-gray-300',
  CANCELLED: 'bg-red-300',
  NO_SHOW: 'bg-red-300',
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
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {days.map((day, i) => {
          const key = day.toLocaleDateString('sv-SE')
          const isToday = key === todayStr
          const dayApts = apptsByDay[key] ?? []
          return (
            <button
              key={key}
              onClick={() => onDayClick(day)}
              className={cn(
                'px-2 py-3 text-center hover:bg-gray-50 transition-colors border-r border-gray-100 last:border-r-0',
                isToday && 'bg-blue-50'
              )}
            >
              <p className="text-xs text-gray-400 font-medium">{DAY_LABELS[i]}</p>
              <p className={cn(
                'text-lg font-bold mt-0.5',
                isToday ? 'text-blue-600' : 'text-gray-900'
              )}>
                {day.getDate()}
              </p>
              {dayApts.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">{dayApts.length} cita{dayApts.length !== 1 ? 's' : ''}</p>
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
              className="border-r border-gray-100 last:border-r-0 p-2 space-y-1.5 min-h-[400px]"
            >
              {dayApts.map((apt) => {
                const status = apt.status as AppointmentStatus
                const typeColor = apt.appointmentType?.color ?? '#3B82F6'
                return (
                  <button
                    key={apt.id}
                    onClick={() => router.push(`/agenda/${apt.id}`)}
                    className="w-full rounded-lg p-2 text-left border border-gray-100 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/40 active:scale-[0.98] transition-all cursor-pointer"
                    style={{ borderLeftColor: typeColor, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[status])} />
                      <p className="text-xs font-semibold text-gray-700">{formatTime(apt.startsAt)}</p>
                    </div>
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Paciente'}
                    </p>
                    {apt.appointmentType && (
                      <p className="text-xs text-gray-400 truncate">{apt.appointmentType.name}</p>
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
