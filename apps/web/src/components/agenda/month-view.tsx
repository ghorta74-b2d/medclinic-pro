'use client'

import { cn, getInitials } from '@/lib/utils'
import { doctorColor, BLOCK_REASON_LABELS } from 'medclinic-shared'
import { isSameLocalDay, monthMatrix, formatShortTime, type AgendaItem } from './lib'

const WEEKDAY_HEAD = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MAX_CHIPS = 3

interface MonthViewProps {
  referenceDate: Date
  items: AgendaItem[]
  hour12: boolean
  showDoctor: boolean
  onDayClick: (date: Date) => void
  onActivate: (item: AgendaItem) => void
}

export function MonthView({ referenceDate, items, hour12, showDoctor, onDayClick, onActivate }: MonthViewProps) {
  const weeks = monthMatrix(referenceDate, 1)
  const month = referenceDate.getMonth()

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Cabecera de días */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {WEEKDAY_HEAD.map((d) => (
          <div key={d} className="px-2 py-1.5 text-center text-[11px] font-medium uppercase text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {weeks.flat().map((day, idx) => {
          const inMonth = day.getMonth() === month
          const today = isSameLocalDay(day, new Date())
          const dayItems = items
            .filter((it) => isSameLocalDay(it.start, day))
            .sort((a, b) => a.start.getTime() - b.start.getTime())
          const visible = dayItems.slice(0, MAX_CHIPS)
          const extra = dayItems.length - visible.length

          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick(day)}
              onKeyDown={(e) => { if (e.key === 'Enter') onDayClick(day) }}
              className={cn(
                'min-h-[104px] cursor-pointer border-b border-l border-border p-1.5 transition-colors first:border-l-0 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40',
                idx % 7 === 0 && 'border-l-0',
                !inMonth && 'bg-muted/20'
              )}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    today && 'bg-primary text-white',
                    !today && (inMonth ? 'text-foreground' : 'text-muted-foreground/50')
                  )}
                >
                  {day.getDate()}
                </span>
              </div>

              <div className="space-y-0.5">
                {visible.map((it) => {
                  const isBlock = it.kind === 'block'
                  const color = doctorColor(it.doctorId)
                  const label = isBlock
                    ? it.block ? BLOCK_REASON_LABELS[it.block.reason] : 'Bloqueo'
                    : it.appointment?.patient
                      ? `${it.appointment.patient.firstName} ${it.appointment.patient.lastName}`
                      : 'Cita'
                  return (
                    <button
                      key={it.id}
                      onClick={(e) => { e.stopPropagation(); onActivate(it) }}
                      title={label}
                      className={cn(
                        'flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] transition-colors',
                        isBlock
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'hover:bg-muted'
                      )}
                    >
                      {!isBlock && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color.bar }} />
                      )}
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatShortTime(it.start, hour12)}
                      </span>
                      <span className="truncate text-foreground">{label}</span>
                      {showDoctor && !isBlock && it.appointment?.doctor && (
                        <span className="ml-auto shrink-0 text-[9px] font-bold" style={{ color: color.bar }}>
                          {getInitials(it.appointment.doctor.firstName, it.appointment.doctor.lastName)}
                        </span>
                      )}
                    </button>
                  )
                })}
                {extra > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDayClick(day) }}
                    className="w-full px-1 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    +{extra} más
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
