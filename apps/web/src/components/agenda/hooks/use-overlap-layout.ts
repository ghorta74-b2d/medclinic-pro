import { useMemo } from 'react'
import type { AgendaItem } from '../lib'
import { minutesSinceMidnight } from '../lib'

export interface LayoutBox {
  leftPct: number
  widthPct: number
}

/**
 * Algoritmo de "lanes" por colisión (estilo Google/Apple Calendar).
 * Agrupa los eventos que se solapan transitivamente en clusters; dentro de
 * cada cluster reparte columnas de forma codiciosa y calcula left%/width% para
 * que ningún evento quede oculto. Eventos de distintos médicos pueden solaparse.
 *
 * Devuelve un mapa id → { leftPct, widthPct }.
 */
export function useOverlapLayout(items: AgendaItem[]): Record<string, LayoutBox> {
  return useMemo(() => computeOverlapLayout(items), [items])
}

/** Versión pura (sin hook) — para calcular el layout de varias columnas en un memo. */
export function computeOverlapLayout(items: AgendaItem[]): Record<string, LayoutBox> {
  {
    const result: Record<string, LayoutBox> = {}
    if (items.length === 0) return result

    // Minutos de inicio/fin (clamp para que items que cruzan medianoche no rompan)
    const meta = items.map((it) => {
      const start = minutesSinceMidnight(it.start)
      let end = minutesSinceMidnight(it.end)
      if (end <= start) end = start + 15 // items de fin al día siguiente o degenerados
      return { id: it.id, start, end }
    })
    meta.sort((a, b) => a.start - b.start || a.end - b.end)

    // Particionar en clusters de eventos que se solapan transitivamente
    let cluster: typeof meta = []
    let clusterEnd = -1

    const flush = () => {
      if (cluster.length === 0) return
      // Asignar columnas codiciosamente
      const colEnds: number[] = [] // fin (min) del último evento de cada columna
      const colOf: Record<string, number> = {}
      for (const ev of cluster) {
        let placed = -1
        for (let c = 0; c < colEnds.length; c++) {
          if (colEnds[c]! <= ev.start) { placed = c; break }
        }
        if (placed === -1) { placed = colEnds.length; colEnds.push(ev.end) }
        else colEnds[placed] = ev.end
        colOf[ev.id] = placed
      }
      const cols = colEnds.length
      const width = 100 / cols
      for (const ev of cluster) {
        result[ev.id] = { leftPct: colOf[ev.id]! * width, widthPct: width }
      }
      cluster = []
      clusterEnd = -1
    }

    for (const ev of meta) {
      if (cluster.length > 0 && ev.start >= clusterEnd) flush()
      cluster.push(ev)
      clusterEnd = Math.max(clusterEnd, ev.end)
    }
    flush()

    return result
  }
}
