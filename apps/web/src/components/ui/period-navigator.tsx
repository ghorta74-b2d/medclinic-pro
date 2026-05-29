'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Granularity = 'dia' | 'semana' | 'mes'

export interface Period {
  granularity: Granularity
  /** Reference date for the selected period (local time). */
  anchor: Date
  /** Inclusive start of the selected period (local 00:00). */
  from: Date
  /** Inclusive end of the selected period (local 23:59:59.999). */
  to: Date
  /** Equivalent previous period, for delta comparison. */
  prevFrom: Date
  prevTo: Date
  /** Human label, e.g. "mayo 2026". */
  label: string
  /** True when the period contains today (can't navigate further forward). */
  isCurrent: boolean
}

function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}
function endOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const shortDate = (d: Date) =>
  d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')

/** Pure helper: derive the full Period descriptor from granularity + anchor. */
export function computePeriod(granularity: Granularity, anchor: Date): Period {
  const today = startOfDay(new Date())
  let from: Date, to: Date, prevFrom: Date, prevTo: Date, label: string, isCurrent: boolean

  if (granularity === 'dia') {
    from = startOfDay(anchor)
    to = endOfDay(anchor)
    prevFrom = startOfDay(new Date(from.getFullYear(), from.getMonth(), from.getDate() - 1))
    prevTo = endOfDay(prevFrom)
    label = capitalize(anchor.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long' }))
    isCurrent = from.getTime() === today.getTime()
  } else if (granularity === 'semana') {
    // 7-day window ending on the anchor day
    to = endOfDay(anchor)
    from = startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - 6))
    prevTo = endOfDay(new Date(from.getFullYear(), from.getMonth(), from.getDate() - 1))
    prevFrom = startOfDay(new Date(prevTo.getFullYear(), prevTo.getMonth(), prevTo.getDate() - 6))
    label = `${shortDate(from)} – ${shortDate(to)}`
    isCurrent = startOfDay(anchor).getTime() === today.getTime()
  } else {
    // full calendar month
    from = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0)
    to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999)
    prevFrom = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1, 0, 0, 0, 0)
    prevTo = new Date(anchor.getFullYear(), anchor.getMonth(), 0, 23, 59, 59, 999)
    label = capitalize(anchor.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }))
    isCurrent = anchor.getFullYear() === today.getFullYear() && anchor.getMonth() === today.getMonth()
  }

  return { granularity, anchor, from, to, prevFrom, prevTo, label, isCurrent }
}

/** Step the anchor one period back (dir=-1) or forward (dir=+1). */
function stepAnchor(granularity: Granularity, anchor: Date, dir: 1 | -1): Date {
  if (granularity === 'dia') return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + dir)
  if (granularity === 'semana') return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 7 * dir)
  return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1)
}

const GRAN_LABELS: Record<Granularity, string> = { dia: 'Día', semana: 'Semana', mes: 'Mes' }

interface Props {
  granularity: Granularity
  anchor: Date
  onChange: (granularity: Granularity, anchor: Date) => void
}

export function PeriodNavigator({ granularity, anchor, onChange }: Props) {
  const period = computePeriod(granularity, anchor)

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Granularity toggle — switching resets to today */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {(['dia', 'semana', 'mes'] as Granularity[]).map((g) => (
          <button
            key={g}
            onClick={() => onChange(g, new Date())}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              granularity === g ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground/80',
            )}
          >
            {GRAN_LABELS[g]}
          </button>
        ))}
      </div>

      {/* Prev / label / next */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(granularity, stepAnchor(granularity, anchor, -1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          aria-label="Período anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="min-w-[150px] text-center text-sm font-semibold text-foreground capitalize">
          {period.label}
        </span>
        <button
          onClick={() => onChange(granularity, stepAnchor(granularity, anchor, 1))}
          disabled={period.isCurrent}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label="Período siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Jump to today */}
      <button
        onClick={() => onChange(granularity, new Date())}
        disabled={period.isCurrent}
        className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Hoy
      </button>
    </div>
  )
}
