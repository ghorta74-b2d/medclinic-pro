'use client'

import { cn } from '@/lib/utils'
import { isSameLocalDay, weekDaysFor, type AgendaItem } from './lib'
import { TimeGrid } from './time-grid'

const DAY_ABBR = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

interface WeekViewProps {
  referenceDate: Date
  items: AgendaItem[]
  startHour: number
  endHour: number
  hour12: boolean
  showDoctor: boolean
  enabled: boolean
  onCreate: (start: Date, end: Date) => void
  onMove: (item: AgendaItem, start: Date, end: Date) => void
  onResize: (item: AgendaItem, start: Date, end: Date) => void
  onActivate: (item: AgendaItem) => void
  onDayClick: (date: Date) => void
}

export function WeekView({
  referenceDate,
  items,
  startHour,
  endHour,
  hour12,
  showDoctor,
  enabled,
  onCreate,
  onMove,
  onResize,
  onActivate,
  onDayClick,
}: WeekViewProps) {
  const days = weekDaysFor(referenceDate, 1)

  return (
    <TimeGrid
      days={days}
      items={items}
      startHour={startHour}
      endHour={endHour}
      hour12={hour12}
      showDoctor={showDoctor}
      enabled={enabled}
      onCreate={(start, end) => onCreate(start, end)}
      onMove={onMove}
      onResize={onResize}
      onActivate={onActivate}
      renderHeader={(day, i) => {
        const today = isSameLocalDay(day, new Date())
        return (
          <button
            onClick={() => onDayClick(day)}
            className="flex w-full flex-col items-center gap-0.5 py-2 transition-colors hover:bg-muted/50"
          >
            <span className="text-[11px] uppercase text-muted-foreground">{DAY_ABBR[i]}</span>
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                today ? 'bg-primary text-white' : 'text-foreground'
              )}
            >
              {day.getDate()}
            </span>
          </button>
        )
      }}
    />
  )
}
