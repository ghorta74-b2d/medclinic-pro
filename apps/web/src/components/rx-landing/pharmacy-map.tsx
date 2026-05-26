'use client'

import { useEffect, useRef, useState } from 'react'
import type { PharmacyCampaign, PharmacyBranch } from 'medclinic-shared'
import { MapPin, Loader2 } from 'lucide-react'

interface NearbyBranch extends PharmacyBranch {
  pharmacyName: string
  distanceKm?: number
}

interface PharmacyMapProps {
  campaigns: PharmacyCampaign[]
  onGeoStateDetected?: (state: string) => void
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
]

// Stable callback name — avoids race conditions with stale scripts
const GMAPS_CB = '__medclinic_gmaps_cb__'

export function PharmacyMap({ campaigns, onGeoStateDetected }: PharmacyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [displayBranches, setDisplayBranches] = useState<NearbyBranch[]>([])
  const [located, setLocated] = useState(false)
  // 'loading' → spinner shown; 'ready' → map visible; 'error' → text fallback
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'error'>('loading')

  const apiKey = process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY']

  const allBranches: NearbyBranch[] = campaigns.flatMap(c =>
    (c.branches ?? [])
      .filter(b => b.lat != null && b.lng != null)
      .map(b => ({ ...b, pharmacyName: c.pharmacy?.name ?? c.displayName }))
  )

  function centroid(branches: NearbyBranch[]): { lat: number; lng: number } {
    if (branches.length === 0) return { lat: 23.6345, lng: -102.5528 }
    return {
      lat: branches.reduce((s, b) => s + b.lat!, 0) / branches.length,
      lng: branches.reduce((s, b) => s + b.lng!, 0) / branches.length,
    }
  }

  /**
   * Draws (or redraws) the map using the classic google.maps.Map + Marker API.
   * Works with v=3 (stable quarterly release) — no mapId required.
   */
  function drawMap(
    center: { lat: number; lng: number },
    userLoc: { lat: number; lng: number } | null,
    zoom: number
  ) {
    if (!mapRef.current || !window.google?.maps?.Map) return

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      disableDefaultUI: true,
      zoomControl: true,
      styles: DARK_MAP_STYLES,
    })

    // Pharmacy branch markers — green circles via SymbolPath (no AdvancedMarker / mapId needed)
    allBranches.forEach(b => {
      new window.google.maps.Marker({
        position: { lat: b.lat!, lng: b.lng! },
        map,
        title: `${b.pharmacyName} — ${b.name}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#22C55E',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
    })

    // User location — blue circle
    if (userLoc) {
      new window.google.maps.Marker({
        position: userLoc,
        map,
        title: 'Tu ubicación',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
    }

    setMapState('ready')
  }

  /**
   * Loads the Google Maps JS API using the callback pattern (v=3, stable quarterly).
   * The callback is the only reliable signal that Maps is fully initialised.
   */
  function loadGoogleMaps(): Promise<boolean> {
    if (!apiKey) return Promise.resolve(false)
    // Already loaded from a previous mount
    if (window.google?.maps?.Map) return Promise.resolve(true)

    // Remove any stale/failed script tag from a previous attempt
    document.querySelector<HTMLScriptElement>('script[data-gmaps]')?.remove()

    return new Promise<boolean>(resolve => {
      let settled = false
      function settle(ok: boolean) {
        if (settled) return
        settled = true
        clearTimeout(tid)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any)[GMAPS_CB]
        resolve(ok)
      }

      const tid = setTimeout(() => settle(false), 12_000)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any)[GMAPS_CB] = () => settle(!!window.google?.maps?.Map)

      const script = document.createElement('script')
      // v=3 = stable quarterly; loading=async + callback = recommended dynamic load pattern
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=3&loading=async&callback=${GMAPS_CB}`
      script.async = true
      script.dataset['gmaps'] = '1'
      script.onerror = () => settle(false)
      document.head.appendChild(script)
    })
  }

  useEffect(() => {
    if (allBranches.length === 0) return
    let cancelled = false

    setDisplayBranches(allBranches.slice(0, 6))

    async function run() {
      const mapsReady = await loadGoogleMaps()
      if (cancelled) return

      if (!mapsReady) {
        setMapState('error')
        startGeolocation(false)
        return
      }

      // Show all branches centred on their centroid first
      drawMap(centroid(allBranches), null, allBranches.length > 1 ? 11 : 13)
      startGeolocation(true)
    }

    function startGeolocation(mapsReady: boolean) {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        pos => {
          if (cancelled) return
          const { latitude, longitude } = pos.coords
          const sorted = allBranches
            .map(b => ({ ...b, distanceKm: haversineKm(latitude, longitude, b.lat!, b.lng!) }))
            .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
          setDisplayBranches(sorted.slice(0, 5))
          setLocated(true)
          onGeoStateDetected?.('')
          // Re-center map on user with nearest branch markers
          if (mapsReady) drawMap({ lat: latitude, lng: longitude }, { lat: latitude, lng: longitude }, 12)
        },
        () => { /* denied — keep centroid view */ },
        { timeout: 8_000, maximumAge: 600_000 }
      )
    }

    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns.length])

  if (allBranches.length === 0) return null

  // No API key configured → plain list
  if (!apiKey) {
    return (
      <div className="space-y-2">
        {allBranches.slice(0, 6).map(b => (
          <div key={b.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">{b.pharmacyName} — {b.name}</p>
              {b.address && <p className="text-xs text-muted-foreground">{b.address}</p>}
              {b.phone && <p className="text-xs text-muted-foreground">{b.phone}</p>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/*
        Map container is always rendered at full height.
        A spinner covers it while loading; an error message if Maps fails.
        The mapRef div fills the container so Maps always has real dimensions to render into.
      */}
      <div
        className="relative w-full rounded-xl overflow-hidden border border-border"
        style={{ height: '14rem' }}
      >
        {/* Maps renders into this div */}
        <div ref={mapRef} className="absolute inset-0" />

        {/* Loading overlay */}
        {mapState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* Error overlay */}
        {mapState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <p className="text-xs text-muted-foreground">Mapa no disponible</p>
          </div>
        )}
      </div>

      {!located && (
        <p className="text-[11px] text-muted-foreground">
          Permite el acceso a tu ubicación para ver las farmacias más cercanas a ti.
        </p>
      )}

      <div className="space-y-2">
        {displayBranches.map(b => (
          <div key={b.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{b.pharmacyName} — {b.name}</p>
              {b.address && <p className="text-xs text-muted-foreground truncate">{b.address}</p>}
              {b.phone && <p className="text-xs text-muted-foreground">{b.phone}</p>}
            </div>
            {b.distanceKm != null && (
              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                {b.distanceKm < 1 ? `${(b.distanceKm * 1000).toFixed(0)}m` : `${b.distanceKm.toFixed(1)}km`}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Augment window type for Google Maps + callback
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any
    __medclinic_gmaps_cb__?: () => void
  }
}
