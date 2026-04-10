'use client'

import { cn } from '@/lib/utils'
import type { Appointment } from 'medclinic-shared'

interface MonthViewProps {
  appointments: Appointment[]
  loading: boolean
  referenceDate: Date
  onDayClick: (date: Date) => void
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getMonthGrid(ref: Date): (Date | null)[] {
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const grid: (Date | null)[] = []

  for (let i = 0; i < startDow; i++) grid.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) grid.push(new Date(year, month, d))

  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-blue-400',
  CONFIRMED: 'bg-green-400',
  CHECKED_IN: 'bg-yellow-400',
  IN_PROGRESS: 'bg-orange-400',
  COMPLETED: 'bg-gray-300',
  CANCELLED: 'bg-red-300',
  NO_SHOW: 'bg-red-300',
}

export function MonthView({ appointments, loading, referenceDate, onDayClick }: MonthViewProps) {
  const grid = getMonthGrid(referenceDate)
  const todayStr = new Date().toLocaleDateString('sv-SE')

  const apptsByDay: Record<string, Appointment[]> = {}
  for (const apt of appointments) {
    const key = new Date(apt.startsAt).toLocaleDateString('sv-SE')
    if (!apptsByDay[key]) apptsByDay[key] = []
    apptsByDay[key]!.push(apt)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-3 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="divide-y divide-gray-100">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-gray-100">
            {week.map((day, di) => {
              if (!day) {
                return <div key={di} className="min-h-[100px] bg-gray-50/50" />
              }
              const key = day.toISOString().split('T')[0]!
              const isToday = key === todayStr
              const dayApts = (apptsByDay[key] ?? []).filter(a => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW')
              const isCurrentMonth = day.getMonth() === referenceDate.getMonth()

              return (
                <button
                  key={di}
                  onClick={() => onDayClick(day)}
                  className={cn(
                    'min-h-[100px] p-2 text-left hover:bg-blue-50/50 transition-colors flex flex-col',
                    !isCurrentMonth && 'opacity-40',
                    isToday && 'bg-blue-50'
                  )}
                >
                  <span className={cn(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1',
                    isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                  )}>
                    {day.getDate()}
                  </span>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {dayApts.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        className={cn(
                          'w-2 h-2 rounded-full',
                          STATUS_COLOR[apt.status] ?? 'bg-gray-300'
                        )}
                        title={apt.patient
                          ? `${apt.patient.firstName} ${apt.patient.lastName}`
                          : 'Cita'}
                      />
                    ))}
                    {dayApts.length > 3 && (
                      <span className="text-xs text-gray-400 leading-none">+{dayApts.length - 3}</span>
                    )}
                  </div>
                  {dayApts.length > 0 && (
                    <p className="text-xs text-gray-400 mt-auto">
                      {dayApts.length} cita{dayApts.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
