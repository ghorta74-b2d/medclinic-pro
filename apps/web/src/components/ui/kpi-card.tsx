'use client'

import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  /** Tailwind text color class for the icon, e.g. "text-primary". */
  color: string
  /** Tailwind background class for the icon chip, e.g. "bg-primary/10". */
  bg: string
  /**
   * Percent change vs the previous period. Positive renders green ↑,
   * negative red ↓. Pass null/undefined to hide the delta badge.
   */
  delta?: number | null
}

export function KpiCard({ label, value, sub, icon: Icon, color, bg, delta }: KpiCardProps) {
  const hasDelta = delta != null && Number.isFinite(delta)
  const up = (delta ?? 0) >= 0

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground truncate">{value}</p>
          <p className="text-sm font-medium text-foreground/80 mt-0.5">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', bg)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
      </div>
      {hasDelta && (
        <div className="mt-2 flex items-center gap-1">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full',
              up ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
            )}
          >
            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(delta as number).toFixed(0)}%
          </span>
          <span className="text-xs text-muted-foreground">vs período anterior</span>
        </div>
      )}
    </div>
  )
}

/** Percent change helper. Returns null when there's no comparable base. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous || previous === 0) return null
  return ((current - previous) / previous) * 100
}
