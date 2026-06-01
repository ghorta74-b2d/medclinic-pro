'use client'

import { CalendarPlus } from 'lucide-react'
import { isSameLocalDay, type AgendaItem } from './lib'
import { TimeGrid } from './time-grid'

interface DayViewProps {
  selectedDate: Date
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
  onNew: () => void
}

export function DayView({
  selectedDate,
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
  onNew,
}: DayViewProps) {
  const dayItems = items.filter((it) => isSameLocalDay(it.start, selectedDate))
  const empty = dayItems.length === 0

  return (
    <div className="space-y-3">
      {empty && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">No hay citas para este día.</span>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <CalendarPlus className="h-4 w-4" /> Nueva cita
          </button>
        </div>
      )}
      <TimeGrid
        days={[selectedDate]}
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
      />
    </div>
  )
}
