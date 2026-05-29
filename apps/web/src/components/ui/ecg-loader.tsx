'use client'

import { cn } from '@/lib/utils'

// Exact heartbeat path from the MediaClinic brand mark (logo-color.svg)
const ECG_PATH = 'M145 601H285L348 456L444 858L565 211L668 608L758 391L847 582H969'

interface EcgLoaderProps {
  /** Icon width in pixels (height scales with the viewBox). */
  size?: number
  /** Extra classes for the wrapper. */
  className?: string
  /** Center the loader in the full available area (e.g. a page/section). */
  fullPage?: boolean
  /** Fill (and center within) the browser viewport height. */
  viewport?: boolean
  /** Optional label under the wave. */
  label?: string
}

/**
 * Animated loading indicator: the MediaClinic ECG wave draws itself and flows
 * out in a seamless loop, evoking a heart monitor. Centered by default.
 *
 * - `viewport`: centers in the full browser window height (page-level loads).
 * - `fullPage`: centers within the available content area (section loads).
 */
export function EcgLoader({ size = 72, className, fullPage, viewport, label }: EcgLoaderProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Cargando'}
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        viewport && 'w-full min-h-[70vh]',
        fullPage && !viewport && 'w-full min-h-[40vh]',
        className,
      )}
    >
      <svg
        width={size}
        viewBox="100 120 880 820"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Faint static baseline so the box never looks empty */}
        <path
          d={ECG_PATH}
          stroke="hsl(var(--primary))"
          strokeWidth={50}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.12}
        />
        {/* Animated wave */}
        <path
          className="ecg-wave-path"
          d={ECG_PATH}
          pathLength={100}
          stroke="hsl(var(--primary))"
          strokeWidth={63}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  )
}
