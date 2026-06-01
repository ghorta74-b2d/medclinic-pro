'use client'

// Motor de interacción de la rejilla (pointer events, sin dependencias).
// Cubre los tres gestos: drag-to-create sobre slots vacíos, mover una cita/bloqueo
// existente (incluido cambio de columna/día en vista Semana) y redimensionar
// arrastrando el borde inferior. Snap a `snapMin`. Preview en vivo vía `draft`.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  DEFAULT_DURATION_MIN,
  MIN_EVENT_MIN,
  clamp,
  dateAtMinutes,
  snap,
  type AgendaItem,
} from '../lib'

type Mode = 'create' | 'move' | 'resize'

export interface Draft {
  mode: Mode
  columnIndex: number
  startMin: number
  endMin: number
  itemId?: string
  kind?: 'appointment' | 'block'
}

interface DragState {
  mode: Mode
  columnIndex: number
  item?: AgendaItem
  anchorMin: number // create: minuto inicial; move: offset de agarre
  durationMin: number // move: duración fija
  startMin: number // resize: inicio fijo
  moved: boolean
  pointerId: number
}

interface Options {
  contentRef: RefObject<HTMLElement | null>
  columnsRef: RefObject<HTMLElement | null>
  days: Date[]
  startHour: number
  endHour: number
  hourHeight: number
  snapMin: number
  enabled: boolean
  onCreate: (start: Date, end: Date, columnIndex: number) => void
  onMove: (item: AgendaItem, start: Date, end: Date) => void
  onResize: (item: AgendaItem, start: Date, end: Date) => void
  onActivate: (item: AgendaItem) => void
}

const MOVE_THRESHOLD_PX = 4

export function useGridInteraction(opts: Options) {
  const { contentRef, columnsRef, days, startHour, endHour, hourHeight, snapMin, enabled } = opts
  const [draft, setDraft] = useState<Draft | null>(null)
  const state = useRef<DragState | null>(null)
  const downY = useRef(0)
  const downX = useRef(0)
  // Referencia viva del draft para leerlo dentro de pointerup
  const draftRef = useRef<Draft | null>(null)
  useEffect(() => { draftRef.current = draft }, [draft])

  // Refs a callbacks para no re-suscribir listeners en cada render
  const cb = useRef(opts)
  useEffect(() => { cb.current = opts })

  const minBound = startHour * 60
  const maxBound = endHour * 60

  const yToMin = useCallback(
    (clientY: number): number => {
      const el = contentRef.current
      if (!el) return minBound
      const rect = el.getBoundingClientRect()
      const y = clientY - rect.top
      const min = minBound + (y / hourHeight) * 60
      return clamp(min, minBound, maxBound)
    },
    [contentRef, hourHeight, minBound, maxBound]
  )

  const colAt = useCallback(
    (clientX: number): number => {
      const el = columnsRef.current
      if (!el || days.length <= 1) return 0
      const rect = el.getBoundingClientRect()
      const w = rect.width / days.length
      return clamp(Math.floor((clientX - rect.left) / w), 0, days.length - 1)
    },
    [columnsRef, days.length]
  )

  useEffect(() => {
    if (!enabled) return

    function onPointerMove(e: PointerEvent) {
      const s = state.current
      if (!s || e.pointerId !== s.pointerId) return
      if (Math.abs(e.clientY - downY.current) > MOVE_THRESHOLD_PX || Math.abs(e.clientX - downX.current) > MOVE_THRESHOLD_PX) {
        s.moved = true
      }
      const curMin = yToMin(e.clientY)

      if (s.mode === 'create') {
        const a = snap(s.anchorMin, snapMin)
        const b = snap(curMin, snapMin)
        const startMin = Math.min(a, b)
        const endMin = Math.max(a, b)
        setDraft({ mode: 'create', columnIndex: s.columnIndex, startMin, endMin: Math.max(endMin, startMin + snapMin) })
      } else if (s.mode === 'move' && s.item) {
        let startMin = snap(curMin - s.anchorMin, snapMin)
        startMin = clamp(startMin, minBound, maxBound - s.durationMin)
        const columnIndex = colAt(e.clientX)
        setDraft({
          mode: 'move',
          columnIndex,
          startMin,
          endMin: startMin + s.durationMin,
          itemId: s.item.id,
          kind: s.item.kind,
        })
      } else if (s.mode === 'resize' && s.item) {
        let endMin = snap(curMin, snapMin)
        endMin = clamp(endMin, s.startMin + MIN_EVENT_MIN, maxBound)
        setDraft({
          mode: 'resize',
          columnIndex: s.columnIndex,
          startMin: s.startMin,
          endMin,
          itemId: s.item.id,
          kind: s.item.kind,
        })
      }
    }

    function onPointerUp() {
      const s = state.current
      state.current = null
      const d = draftRef.current
      setDraft(null)
      if (!s) return

      const o = cb.current

      if (s.mode === 'create') {
        let startMin: number, endMin: number
        if (d && s.moved) {
          startMin = d.startMin
          endMin = d.endMin
        } else {
          // Click simple → slot de duración por defecto
          startMin = clamp(snap(s.anchorMin, snapMin), minBound, maxBound - DEFAULT_DURATION_MIN)
          endMin = startMin + DEFAULT_DURATION_MIN
        }
        const base = o.days[s.columnIndex]!
        o.onCreate(dateAtMinutes(base, startMin), dateAtMinutes(base, endMin), s.columnIndex)
        return
      }

      if (!s.item) return

      if (!s.moved) {
        // Click sin arrastre → abrir editor
        o.onActivate(s.item)
        return
      }

      if (s.mode === 'move' && d) {
        const base = o.days[d.columnIndex]!
        o.onMove(s.item, dateAtMinutes(base, d.startMin), dateAtMinutes(base, d.endMin))
      } else if (s.mode === 'resize' && d) {
        const base = o.days[s.columnIndex]!
        o.onResize(s.item, dateAtMinutes(base, d.startMin), dateAtMinutes(base, d.endMin))
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [enabled, yToMin, colAt, snapMin, minBound, maxBound])

  const startCreate = useCallback(
    (e: React.PointerEvent, columnIndex: number) => {
      if (!enabled || e.button !== 0) return
      downY.current = e.clientY
      downX.current = e.clientX
      const anchorMin = yToMin(e.clientY)
      state.current = { mode: 'create', columnIndex, anchorMin, durationMin: 0, startMin: 0, moved: false, pointerId: e.pointerId }
    },
    [enabled, yToMin]
  )

  const startMove = useCallback(
    (e: React.PointerEvent, columnIndex: number, item: AgendaItem) => {
      if (!enabled || e.button !== 0) return
      e.stopPropagation()
      downY.current = e.clientY
      downX.current = e.clientX
      const pointerMin = yToMin(e.clientY)
      const itemStartMin = item.start.getHours() * 60 + item.start.getMinutes()
      const itemEndMin = item.end.getHours() * 60 + item.end.getMinutes()
      state.current = {
        mode: 'move',
        columnIndex,
        item,
        anchorMin: pointerMin - itemStartMin,
        durationMin: Math.max(MIN_EVENT_MIN, itemEndMin - itemStartMin),
        startMin: itemStartMin,
        moved: false,
        pointerId: e.pointerId,
      }
    },
    [enabled, yToMin]
  )

  const startResize = useCallback(
    (e: React.PointerEvent, columnIndex: number, item: AgendaItem) => {
      if (!enabled || e.button !== 0) return
      e.stopPropagation()
      downY.current = e.clientY
      downX.current = e.clientX
      const itemStartMin = item.start.getHours() * 60 + item.start.getMinutes()
      state.current = {
        mode: 'resize',
        columnIndex,
        item,
        anchorMin: 0,
        durationMin: 0,
        startMin: itemStartMin,
        moved: false,
        pointerId: e.pointerId,
      }
    },
    [enabled]
  )

  return { draft, startCreate, startMove, startResize }
}
