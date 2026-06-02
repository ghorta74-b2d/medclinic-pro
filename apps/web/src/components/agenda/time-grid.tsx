'use client'

import { useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  HOUR_HEIGHT,
  SNAP_MIN,
  hourRange,
  formatHourLabel,
  formatShortTime,
  isSameLocalDay,
  minutesSinceMidnight,
  dateAtMinutes,
  type AgendaItem,
} from './lib'
import { computeOverlapLayout } from './hooks/use-overlap-layout'
import { useNowLine } from './hooks/use-now-line'
import { useGridInteraction } from './hooks/use-grid-interaction'
import { AgendaEvent } from './event-block'

const GUTTER_W = 56 // px

export interface TimeGridProps {
  days: Date[]
  items: AgendaItem[]
  startHour: number
  endHour: number
  hour12: boolean
  showDoctor: boolean
  enabled: boolean
  renderHeader?: (day: Date, index: number) => React.ReactNode
  onCreate: (start: Date, end: Date, columnIndex: number) => void
  onMove: (item: AgendaItem, start: Date, end: Date) => void
  onResize: (item: AgendaItem, start: Date, end: Date) => void
  onActivate: (item: AgendaItem) => void
}

export function TimeGrid({
  days,
  items,
  startHour,
  endHour,
  hour12,
  showDoctor,
  enabled,
  renderHeader,
  onCreate,
  onMove,
  onResize,
  onActivate,
}: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const hours = hourRange(startHour, endHour)
  const gridHeight = (endHour - startHour) * HOUR_HEIGHT
  const startMin = startHour * 60

  const { draft, startCreate, startMove, startResize } = useGridInteraction({
    contentRef: bodyRef,
    columnsRef: bodyRef,
    days,
    startHour,
    endHour,
    hourHeight: HOUR_HEIGHT,
    snapMin: SNAP_MIN,
    enabled,
    onCreate,
    onMove,
    onResize,
    onActivate,
  })

  // Layout por columna (algoritmo de lanes) — memorizado sobre todos los días.
  const perColumn = useMemo(() => {
    return days.map((day) => {
      const dayItems = items.filter((it) => isSameLocalDay(it.start, day))
      return { dayItems, layout: computeOverlapLayout(dayItems) }
    })
  }, [days, items])

  const todayIndex = days.findIndex((d) => isSameLocalDay(d, new Date()))
  const now = useNowLine(days[0] ?? new Date(), startHour, endHour, todayIndex !== -1)

  // Auto-scroll al montar: dejar visible la hora actual (o el inicio de jornada)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const target = now.visible ? Math.max(0, now.topPx - 120) : 0
    el.scrollTop = target
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const topFor = (d: Date) => ((minutesSinceMidnight(d) - startMin) / 60) * HOUR_HEIGHT
  const heightFor = (a: Date, b: Date) =>
    ((minutesSinceMidnight(b) - minutesSinceMidnight(a)) / 60) * HOUR_HEIGHT

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        {/* Encabezados de columna (Semana) */}
        {renderHeader && (
          <div className="flex border-b border-border">
            <div style={{ width: GUTTER_W }} className="shrink-0" />
            <div className="flex flex-1">
              {days.map((day, i) => (
                <div key={i} className="flex-1 border-l border-border first:border-l-0">
                  {renderHeader(day, i)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cuerpo con scroll */}
        <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="flex">
            {/* Gutter de horas */}
            <div className="relative shrink-0" style={{ width: GUTTER_W, height: gridHeight }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute right-1.5 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
                  style={{ top: ((h - startHour) * 60 / 60) * HOUR_HEIGHT }}
                >
                  {h === startHour ? '' : formatHourLabel(h, hour12)}
                </div>
              ))}
            </div>

            {/* Columnas + eventos */}
            <div
              ref={bodyRef}
              role="grid"
              aria-label="Rejilla de horarios"
              className="relative flex-1"
              style={{ height: gridHeight }}
            >
              {/* Líneas de hora / media hora */}
              <div className="pointer-events-none absolute inset-0">
                {hours.map((h) => (
                  <div key={`h${h}`}>
                    <div
                      className="absolute inset-x-0 border-t border-border"
                      style={{ top: (h - startHour) * HOUR_HEIGHT }}
                    />
                    {h < endHour && (
                      <div
                        className="absolute inset-x-0 border-t border-border/40"
                        style={{ top: (h - startHour) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Columnas */}
              <div className="absolute inset-0 flex">
                {days.map((day, ci) => {
                  const { dayItems, layout } = perColumn[ci]!
                  return (
                    <div
                      key={ci}
                      data-col-index={ci}
                      role="gridcell"
                      tabIndex={0}
                      aria-label={day.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                      onPointerDown={(e) => {
                        // Solo iniciar create si el target es el fondo de la columna
                        if (e.currentTarget === e.target) startCreate(e, ci)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const base = dateAtMinutes(day, startMin)
                          onCreate(base, dateAtMinutes(day, startMin + 30), ci)
                        }
                      }}
                      className="relative flex-1 border-l border-border first:border-l-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40"
                    >
                      {dayItems.map((it) => {
                        const box = layout[it.id] ?? { leftPct: 0, widthPct: 100 }
                        const isDraftItem = draft && draft.itemId === it.id
                        return (
                          <AgendaEvent
                            key={it.id}
                            item={it}
                            topPx={topFor(it.start)}
                            heightPx={heightFor(it.start, it.end)}
                            leftPct={box.leftPct}
                            widthPct={box.widthPct}
                            hour12={hour12}
                            showDoctor={showDoctor}
                            ghost={!!isDraftItem}
                            onMoveStart={(e) => startMove(e, ci, it)}
                            onResizeStart={(e) => startResize(e, ci, it)}
                            onActivate={() => onActivate(it)}
                          />
                        )
                      })}

                      {/* Línea de "ahora" en la columna de hoy */}
                      {now.visible && ci === todayIndex && (
                        <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: now.topPx }}>
                          <div className="relative">
                            <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                            <div className="border-t border-red-500" />
                          </div>
                        </div>
                      )}

                      {/* Preview del draft (create / move / resize) en su columna */}
                      {draft && draft.columnIndex === ci && (
                        <div
                          className={cn(
                            'pointer-events-none absolute z-30 rounded-md border-2 border-dashed text-[11px]',
                            draft.kind === 'block'
                              ? 'border-amber-500 bg-amber-500/15'
                              : 'border-primary bg-primary/15'
                          )}
                          style={{
                            top: ((draft.startMin - startMin) / 60) * HOUR_HEIGHT,
                            height: Math.max(((draft.endMin - draft.startMin) / 60) * HOUR_HEIGHT, 16),
                            left: 2,
                            right: 2,
                          }}
                        >
                          <span className="px-1.5 font-medium text-foreground">
                            {formatShortTime(dateAtMinutes(day, draft.startMin), hour12)} –{' '}
                            {formatShortTime(dateAtMinutes(day, draft.endMin), hour12)}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
