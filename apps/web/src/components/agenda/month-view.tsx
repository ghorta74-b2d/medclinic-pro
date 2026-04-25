'use client'

import { useRouter } from 'next/navigation'
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
  SCHEDULED: 'bg-primary',
  CONFIRMED: 'bg-success',
  CHECKED_IN: 'bg-warning',
  IN_PROGRESS: 'bg-warning',
  COMPLETED: 'bg-muted-foreground/60',
  CANCELLED: 'bg-destructive/70',
  NO_SHOW: 'bg-destructive/70',
}

export function MonthView({ appointments, loading, referenceDate, onDayClick }: MonthViewProps) {
  const router = useRouter()
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
      <div className="bg-card rounded-xl border border-border p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7))
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-3 text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="divide-y divide-border/50">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-border/50">
            {week.map((day, di) => {
              if (!day) {
                return <div key={di} className="min-h-[100px] bg-muted/50" />
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
                    'min-h-[100px] p-2 text-left hover:bg-primary/10/50 transition-colors flex flex-col',
                    !isCurrentMonth && 'opacity-40',
                    isToday && 'bg-primary/10'
                  )}
                >
                  <span className={cn(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1',
                    isToday ? 'bg-primary text-white' : 'text-foreground/80'
                  )}>
                    {day.getDate()}
                  </span>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {dayApts.slice(0, 3).map((apt) => (
                      <button
                        key={apt.id}
                        onClick={(e) => { e.stopPropagation(); router.push(`/agenda/${apt.id}`) }}
                        className={cn(
                          'w-2 h-2 rounded-full hover:scale-125 transition-transform',
                          STATUS_COLOR[apt.status] ?? 'bg-muted-foreground/60'
                        )}
                        title={apt.patient
                          ? `${apt.patient.firstName} ${apt.patient.lastName}`
                          : 'Cita'}
                      />
                    ))}
                    {dayApts.length > 3 && (
                      <span className="text-xs text-muted-foreground leading-none">+{dayApts.length - 3}</span>
                    )}
                  </div>
                  {dayApts.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-auto">
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
