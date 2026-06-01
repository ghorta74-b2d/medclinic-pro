// Núcleo del módulo Agenda: constantes, modelo unificado de eventos y
// utilidades de tiempo. Toda la matemática de fechas vive aquí (no en los
// componentes). Coherente con el resto de la app, la hora se interpreta en la
// zona horaria del navegador (= zona de la clínica).

import type { Appointment, ScheduleBlock } from 'medclinic-shared'

// ── Constantes de rejilla ────────────────────────────────────
export const HOUR_HEIGHT = 60 // px por hora → 1px = 1min (matemática trivial)
export const DEFAULT_START_HOUR = 9
export const DEFAULT_END_HOUR = 19
export const SNAP_MIN = 15
export const DEFAULT_DURATION_MIN = 30
export const MIN_EVENT_MIN = 15

// ── Modelo unificado ─────────────────────────────────────────
export type AgendaItemKind = 'appointment' | 'block'

export interface AgendaItem {
  id: string
  kind: AgendaItemKind
  start: Date
  end: Date
  doctorId: string
  appointment?: Appointment
  block?: ScheduleBlock
}

// Citas que NO ocupan espacio activo en la rejilla (canceladas / no asistió)
const HIDDEN_STATUSES = new Set(['CANCELLED', 'NO_SHOW'])

export function buildAgendaItems(
  appointments: Appointment[],
  blocks: ScheduleBlock[]
): AgendaItem[] {
  const apptItems: AgendaItem[] = appointments
    .filter((a) => !HIDDEN_STATUSES.has(a.status))
    .map((a) => ({
      id: a.id,
      kind: 'appointment' as const,
      start: new Date(a.startsAt),
      end: new Date(a.endsAt),
      doctorId: a.doctorId,
      appointment: a,
    }))
  const blockItems: AgendaItem[] = blocks.map((b) => ({
    id: b.id,
    kind: 'block' as const,
    start: new Date(b.startsAt),
    end: new Date(b.endsAt),
    doctorId: b.doctorId,
    block: b,
  }))
  return [...apptItems, ...blockItems]
}

// ── Tiempo ───────────────────────────────────────────────────
export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

export function snap(min: number, step = SNAP_MIN): number {
  return Math.round(min / step) * step
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Devuelve un Date en el día `base` (medianoche local) a `min` minutos. */
export function dateAtMinutes(base: Date, min: number): Date {
  const x = startOfLocalDay(base)
  x.setMinutes(min)
  return x
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** 7 días (medianoche local) de la semana que contiene `date`. weekStartsOn=1 → lunes. */
export function weekDaysFor(date: Date, weekStartsOn = 1): Date[] {
  const start = startOfLocalDay(date)
  const day = start.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  start.setDate(start.getDate() - diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

/** Matriz del mes: semanas × 7 días (medianoche local), incluye relleno de mes vecino. */
export function monthMatrix(date: Date, weekStartsOn = 1): Date[][] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const startDay = (first.getDay() - weekStartsOn + 7) % 7
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - startDay)

  const weeks: Date[][] = []
  const cursor = new Date(gridStart)
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
    // Cortar a 5 filas si la 6ª pertenece por completo al mes siguiente
    if (w === 4 && cursor.getMonth() !== date.getMonth()) break
  }
  return weeks
}

// ── Formato de hora ──────────────────────────────────────────
export function formatHourLabel(hour: number, hour12: boolean): string {
  if (!hour12) return `${String(hour).padStart(2, '0')}:00`
  const period = hour < 12 ? 'a.m.' : 'p.m.'
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h} ${period}`
}

/** "3 p.m." / "12:30 p.m." — etiqueta corta para chips y bloques. */
export function formatShortTime(d: Date, hour12: boolean): string {
  const h = d.getHours()
  const m = d.getMinutes()
  if (!hour12) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  const period = h < 12 ? 'a.m.' : 'p.m.'
  const hh = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hh} ${period}` : `${hh}:${String(m).padStart(2, '0')} ${period}`
}

export function hourRange(startHour: number, endHour: number): number[] {
  return Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)
}
