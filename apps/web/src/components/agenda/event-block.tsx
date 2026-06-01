'use client'

import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  BLOCK_REASON_LABELS,
  doctorColor,
  type AppointmentStatus,
} from 'medclinic-shared'
import { cn, getInitials } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { formatShortTime, type AgendaItem } from './lib'

const STATUS_DOT: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  gray: 'bg-zinc-400',
  red: 'bg-red-500',
}

export interface AgendaEventProps {
  item: AgendaItem
  topPx: number
  heightPx: number
  leftPct: number
  widthPct: number
  hour12: boolean
  /** Mostrar color + iniciales del médico (vista "Todos los médicos"). */
  showDoctor: boolean
  /** Atenuar visualmente (p. ej. el original mientras se arrastra una copia). */
  ghost?: boolean
  onMoveStart?: (e: ReactPointerEvent) => void
  onResizeStart?: (e: ReactPointerEvent) => void
  onActivate?: () => void
}

export function AgendaEvent({
  item,
  topPx,
  heightPx,
  leftPct,
  widthPct,
  hour12,
  showDoctor,
  ghost,
  onMoveStart,
  onResizeStart,
  onActivate,
}: AgendaEventProps) {
  const handleKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivate?.()
    }
  }
  const timeLabel = `${formatShortTime(item.start, hour12)} – ${formatShortTime(item.end, hour12)}`
  const short = heightPx < 44
  const color = doctorColor(item.doctorId)

  const positionStyle = {
    top: topPx,
    height: Math.max(heightPx, 18),
    left: `calc(${leftPct}% + 2px)`,
    width: `calc(${widthPct}% - 4px)`,
  } as const

  if (item.kind === 'block') {
    const reason = item.block ? BLOCK_REASON_LABELS[item.block.reason] : 'Bloqueo'
    const doctorName = item.block?.doctor
      ? `Dr. ${item.block.doctor.firstName} ${item.block.doctor.lastName}`
      : ''
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            aria-label={`Bloqueo: ${reason}, ${timeLabel}`}
            onPointerDown={onMoveStart}
            onKeyDown={handleKey}
            className={cn(
              'group absolute touch-none select-none overflow-hidden rounded-md border border-dashed border-amber-500/50 text-[11px] leading-tight transition-shadow',
              'cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-ring',
              ghost && 'opacity-40'
            )}
            style={{
              ...positionStyle,
              backgroundColor: 'hsl(38 92% 50% / 0.12)',
              backgroundImage:
                'repeating-linear-gradient(45deg, hsl(38 92% 50% / 0.14) 0 6px, transparent 6px 12px)',
            }}
          >
            <div className="px-1.5 py-1">
              <p className="font-medium text-amber-700 dark:text-amber-300">{reason}</p>
              {!short && <p className="text-muted-foreground">{timeLabel}</p>}
            </div>
            {onResizeStart && (
              <div
                onPointerDown={onResizeStart}
                className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                aria-hidden
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{reason}</p>
          {doctorName && <p>{doctorName}</p>}
          <p className="text-muted-foreground">{timeLabel}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // ── Cita ──────────────────────────────────────────────────
  const a = item.appointment!
  const status = a.status as AppointmentStatus
  const patientName = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : 'Paciente'
  const doctorName = a.doctor ? `${a.doctor.firstName} ${a.doctor.lastName}` : ''
  const dotClass = STATUS_DOT[STATUS_COLORS[status]] ?? 'bg-zinc-400'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={`${patientName}, ${timeLabel}, ${STATUS_LABELS[status]}`}
          onPointerDown={onMoveStart}
          onKeyDown={handleKey}
          className={cn(
            'group absolute touch-none select-none overflow-hidden rounded-md border text-[11px] leading-tight shadow-sm transition-shadow hover:shadow-md',
            'cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-ring',
            ghost && 'opacity-40'
          )}
          style={{
            ...positionStyle,
            backgroundColor: color.bg,
            borderColor: color.ring,
            borderLeft: `3px solid ${color.bar}`,
          }}
        >
          <div className="flex h-full flex-col px-1.5 py-1">
            <div className="flex items-start justify-between gap-1">
              <span className={cn('truncate font-semibold text-foreground', short && 'text-[10px]')}>
                {patientName}
              </span>
              {showDoctor && a.doctor && (
                <span
                  className="shrink-0 rounded px-1 text-[9px] font-bold text-white"
                  style={{ backgroundColor: color.bar }}
                >
                  {getInitials(a.doctor.firstName, a.doctor.lastName)}
                </span>
              )}
            </div>
            {!short && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} />
                {timeLabel}
              </span>
            )}
          </div>
          {onResizeStart && (
            <div
              onPointerDown={onResizeStart}
              className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100"
              aria-hidden
            />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold">{patientName}</p>
        {doctorName && <p>Dr. {doctorName}</p>}
        <p>{timeLabel}</p>
        <p className="text-muted-foreground">{STATUS_LABELS[status]}</p>
        {a.chiefComplaint && <p className="mt-1 max-w-[200px] text-muted-foreground">{a.chiefComplaint}</p>}
      </TooltipContent>
    </Tooltip>
  )
}
