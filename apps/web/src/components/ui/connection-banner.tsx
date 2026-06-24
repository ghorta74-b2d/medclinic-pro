'use client'

import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

/**
 * Global "sin conexión" banner.
 *
 * Listens for the reachability events broadcast by lib/api.ts (`mc:api-offline`
 * / `mc:api-online`). When the API host can't be reached — e.g. the network
 * blocks it or there's no internet — it shows a clear banner with a retry, so
 * the user never sees a misleading empty "0 registros" and thinks their data
 * was lost. As soon as any request succeeds, the banner disappears.
 */
export function ConnectionBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('mc:api-offline', goOffline)
    window.addEventListener('mc:api-online', goOnline)
    return () => {
      window.removeEventListener('mc:api-offline', goOffline)
      window.removeEventListener('mc:api-online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-950 px-4 py-3 shadow-2xl max-w-[calc(100vw-2rem)]"
    >
      <WifiOff className="h-5 w-5 shrink-0 text-amber-400" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-100">Sin conexión con el servidor</p>
        <p className="text-xs text-amber-200/80">
          No se pudieron cargar los datos. Revisa tu conexión a internet (o la red WiFi) e inténtalo de nuevo.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-400"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Reintentar
      </button>
    </div>
  )
}
