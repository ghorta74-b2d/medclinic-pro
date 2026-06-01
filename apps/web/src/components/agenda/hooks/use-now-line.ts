import { useEffect, useState } from 'react'
import { HOUR_HEIGHT, minutesSinceMidnight } from '../lib'

export interface NowLine {
  visible: boolean
  /** Offset en px desde el inicio de la rejilla. */
  topPx: number
  now: Date
}

/**
 * Posición de la línea de "ahora". Se refresca cada minuto. Solo es visible si
 * el día mostrado es hoy y la hora actual cae dentro del rango de la rejilla.
 */
export function useNowLine(day: Date, startHour: number, endHour: number, isToday: boolean): NowLine {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const min = minutesSinceMidnight(now)
  const startMin = startHour * 60
  const endMin = endHour * 60
  const visible = isToday && min >= startMin && min <= endMin
  const topPx = ((min - startMin) / 60) * HOUR_HEIGHT

  return { visible, topPx, now }
}
