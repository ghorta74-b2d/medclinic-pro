'use client'

import { useEffect, useRef, useState } from 'react'
import type { PharmacyCampaign, PharmacyBranch } from 'medclinic-shared'
import { MapPin } from 'lucide-react'

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

export function PharmacyMap({ campaigns, onGeoStateDetected }: PharmacyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [displayBranches, setDisplayBranches] = useState<NearbyBranch[]>([])
  const [located, setLocated] = useState(false)

  const apiKey = process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY']

  // Flatten all branches with valid coordinates from all campaigns
  const allBranches: NearbyBranch[] = campaigns.flatMap(c =>
    (c.branches ?? [])
      .filter(b => b.lat != null && b.lng != null)
      .map(b => ({ ...b, pharmacyName: c.pharmacy?.name ?? c.displayName }))
  )

  function centroid(branches: NearbyBranch[]): { lat: number; lng: number } {
    if (branches.length === 0) return { lat: 23.6345, lng: -102.5528 } // centro de México
    return {
      lat: branches.reduce((s, b) => s + b.lat!, 0) / branches.length,
      lng: branches.reduce((s, b) => s + b.lng!, 0) / branches.length,
    }
  }

  function renderMap(center: { lat: number; lng: number }, userLoc: { lat: number; lng: number } | null, zoom: number) {
    if (!mapRef.current || !window.google?.maps) return
    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      disableDefaultUI: true,
      zoomControl: true,
      styles: DARK_MAP_STYLES,
    })

    // All allied pharmacy branches (always shown)
    allBranches.forEach(b => {
      new window.google.maps.Marker({
        position: { lat: b.lat!, lng: b.lng! },
        map,
        title: `${b.pharmacyName} — ${b.name}`,
        icon: { path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 6, fillColor: '#22C55E', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 1 },
      })
    })

    // User marker (only when geolocation granted)
    if (userLoc) {
      new window.google.maps.Marker({
        position: userLoc,
        map,
        title: 'Tu ubicación',
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#3B82F6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      })
    }
  }

  async function ensureGoogle(): Promise<boolean> {
    if (!apiKey) return false
    if (window.google?.maps) return true

    return new Promise<boolean>((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-gmaps]')
      if (existing) {
        // Script is already in the DOM. If it already fired 'load', the event
        // won't fire again — we must check synchronously and time-out quickly.
        if (window.google?.maps) { resolve(true); return }
        const tid = setTimeout(() => resolve(false), 5000)
        existing.addEventListener('load', () => { clearTimeout(tid); resolve(!!window.google?.maps) })
        existing.addEventListener('error', () => { clearTimeout(tid); resolve(false) })
        return
      }
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`
      script.async = true
      script.dataset['gmaps'] = '1'
      const tid = setTimeout(() => resolve(false), 10000)
      script.onload = () => { clearTimeout(tid); resolve(!!window.google?.maps) }
      script.onerror = () => { clearTimeout(tid); resolve(false) }
      document.head.appendChild(script)
    })
  }

  useEffect(() => {
    if (allBranches.length === 0) return
    let cancelled = false

    // Show all branches immediately (no distance yet)
    setDisplayBranches(allBranches.slice(0, 6))

    function tryRenderMap(center: { lat: number; lng: number }, userLoc: { lat: number; lng: number } | null, zoom: number) {
      try { renderMap(center, userLoc, zoom) } catch { /* Maps API unavailable — text list already shown */ }
    }

    // Geolocation runs independently of map loading so the browser always shows the permission prompt
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
          if (mapsReady) tryRenderMap({ lat: latitude, lng: longitude }, { lat: latitude, lng: longitude }, 12)
        },
        () => { /* denied — keep centroid view + full list */ },
        { timeout: 8000, maximumAge: 600000 }
      )
    }

    ;(async () => {
      const mapsReady = await ensureGoogle()
      if (cancelled) return

      if (mapsReady) tryRenderMap(centroid(allBranches), null, allBranches.length > 1 ? 11 : 13)
      startGeolocation(mapsReady)
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns.length])

  if (allBranches.length === 0) return null

  // No API key → text-only list fallback
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
      <div ref={mapRef} className="w-full h-56 rounded-xl overflow-hidden border border-border bg-muted" />
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

// Augment window type for Google Maps
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any
  }
}
