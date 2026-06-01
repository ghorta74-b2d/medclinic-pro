'use client'

import { useEffect, useState } from 'react'

/**
 * Reactive media-query hook. SSR-safe: returns `false` until mounted, then
 * tracks `matches`. Use with Tailwind-aligned breakpoints, e.g.
 * `useMediaQuery('(min-width: 768px)')` for the `md` breakpoint.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** True on viewports ≥ md (768px) — i.e. tablet/desktop. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)')
}
