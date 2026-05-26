'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap } from 'leaflet'
import type { PharmacyCampaign, PharmacyBranch } from 'medclinic-shared'
import { MapPin, Loader2, Navigation } from 'lucide-react'

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

export function PharmacyMap({ campaigns, onGeoStateDetected }: PharmacyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<LeafletMap | null>(null)
  // userPos: null = not yet determined; undefined = denied/unavailable
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null | undefined>(null)
  const [displayBranches, setDisplayBranches] = useState<NearbyBranch[]>([])
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'error'>('loading')

  const allBranches: NearbyBranch[] = campaigns.flatMap(c =>
    (c.branches ?? [])
      .filter(b => b.lat != null && b.lng != null)
      .map(b => ({ ...b, pharmacyName: c.pharmacy?.name ?? c.displayName }))
  )

  function centroid(branches: NearbyBranch[]): [number, number] {
    if (branches.length === 0) return [23.6345, -102.5528] // centro de México
    return [
      branches.reduce((s, b) => s + b.lat!, 0) / branches.length,
      branches.reduce((s, b) => s + b.lng!, 0) / branches.length,
    ]
  }

  /**
   * Draws (or redraws) the Leaflet map. Uses CartoDB Dark Matter tiles —
   * free, no API key, dark theme that matches the app's dark mode.
   */
  async function drawMap(
    center: [number, number],
    userLoc: [number, number] | null,
    zoom: number
  ) {
    if (!mapContainerRef.current) return

    try {
      const L = (await import('leaflet')).default

      // Destroy existing instance so we can re-use the same DOM node
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }

      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: false,
      })
      leafletMapRef.current = map

      // CartoDB Dark Matter — free, no API key required
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 20 }
      ).addTo(map)

      // Pharmacy branch markers — green circles
      allBranches.forEach(b => {
        L.circleMarker([b.lat!, b.lng!], {
          radius: 8,
          fillColor: '#22C55E',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
        })
          .bindPopup(`<strong>${b.pharmacyName}</strong><br/>${b.name}`)
          .addTo(map)
      })

      // User location — blue circle
      if (userLoc) {
        L.circleMarker(userLoc, {
          radius: 9,
          fillColor: '#3B82F6',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
        })
          .bindPopup('Tu ubicación')
          .addTo(map)
      }

      setMapState('ready')
    } catch (err) {
      console.warn('[PharmacyMap] Leaflet init error:', err)
      setMapState('error')
    }
  }

  const MAX_DISTANCE_KM = 20

  function buildGoogleMapsUrl(branch: NearbyBranch, origin: { lat: number; lng: number } | null | undefined) {
    const dest = `${branch.lat},${branch.lng}`
    if (origin) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest}&travelmode=driving`
    }
    return `https://www.google.com/maps/search/?api=1&query=${dest}`
  }

  useEffect(() => {
    if (allBranches.length === 0) return
    let cancelled = false

    // Draw initial map centred on all branches (before we know user location)
    drawMap(centroid(allBranches), null, allBranches.length > 1 ? 11 : 13)

    // Geolocation
    if (!navigator.geolocation) {
      // No geolocation support — show all branches
      setUserPos(undefined)
      setDisplayBranches(allBranches)
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        if (cancelled) return
        const { latitude, longitude } = pos.coords
        const withDist = allBranches
          .map(b => ({ ...b, distanceKm: haversineKm(latitude, longitude, b.lat!, b.lng!) }))
          .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))

        // Filter to ≤15 km; if none found within radius show the 3 nearest regardless
        const nearby = withDist.filter(b => (b.distanceKm ?? 999) <= MAX_DISTANCE_KM)
        setDisplayBranches(nearby.length > 0 ? nearby : withDist.slice(0, 3))

        const pos2d = { lat: latitude, lng: longitude }
        setUserPos(pos2d)
        onGeoStateDetected?.('')
        drawMap([latitude, longitude], [latitude, longitude], 12)
      },
      () => {
        if (cancelled) return
        // Denied — show all branches, no distances
        setUserPos(undefined)
        setDisplayBranches(allBranches)
      },
      { timeout: 8_000, maximumAge: 600_000 }
    )

    return () => {
      cancelled = true
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns.length])

  if (allBranches.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Map container — always visible at full height */}
      <div
        className="relative w-full rounded-xl overflow-hidden border border-border"
        style={{ height: '14rem' }}
      >
        <div ref={mapContainerRef} className="absolute inset-0" />

        {mapState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted pointer-events-none">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}
        {mapState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <p className="text-xs text-muted-foreground">Mapa no disponible</p>
          </div>
        )}
      </div>

      {/* Location status hint */}
      {userPos === null && (
        <p className="text-[11px] text-muted-foreground">
          Permite el acceso a tu ubicación para ver las farmacias más cercanas a ti.
        </p>
      )}
      {userPos === undefined && displayBranches.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Activa la ubicación para ver farmacias a menos de {MAX_DISTANCE_KM} km.
        </p>
      )}
      {userPos && displayBranches.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          No hay farmacias aliadas en un radio de {MAX_DISTANCE_KM} km.
        </p>
      )}

      {displayBranches.length > 0 && (
        <div className="space-y-2">
          {displayBranches.map(b => (
            <a
              key={b.id}
              href={buildGoogleMapsUrl(b, userPos ?? null)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 active:bg-muted/60 transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{b.pharmacyName} — {b.name}</p>
                {b.address && <p className="text-xs text-muted-foreground truncate">{b.address}</p>}
                {b.phone && <p className="text-xs text-muted-foreground">{b.phone}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {b.distanceKm != null && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {b.distanceKm < 1 ? `${(b.distanceKm * 1000).toFixed(0)}m` : `${b.distanceKm.toFixed(1)}km`}
                  </span>
                )}
                <Navigation className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
