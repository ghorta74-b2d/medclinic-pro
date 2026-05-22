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

export function PharmacyMap({ campaigns, onGeoStateDetected }: PharmacyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [nearbyBranches, setNearbyBranches] = useState<NearbyBranch[]>([])
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle')
  const [zipInput, setZipInput] = useState('')
  const [mapLoaded, setMapLoaded] = useState(false)

  // Flatten all branches from all campaigns
  const allBranches: NearbyBranch[] = campaigns.flatMap(c =>
    (c.branches ?? [])
      .filter(b => b.lat != null && b.lng != null)
      .map(b => ({ ...b, pharmacyName: c.pharmacy?.name ?? c.displayName }))
  )

  const apiKey = process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY']

  function sortBranches(userLat: number, userLng: number) {
    const sorted = allBranches
      .map(b => ({ ...b, distanceKm: haversineKm(userLat, userLng, b.lat!, b.lng!) }))
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
      .slice(0, 5)
    setNearbyBranches(sorted)
    return sorted
  }

  function initMap(userLat: number, userLng: number, sorted: NearbyBranch[]) {
    if (!mapRef.current || !window.google) return

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: userLat, lng: userLng },
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [{ elementType: 'geometry', stylers: [{ color: '#212121' }] },
               { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] }],
    })

    // User marker
    new window.google.maps.Marker({
      position: { lat: userLat, lng: userLng },
      map,
      title: 'Tu ubicación',
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#3B82F6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
    })

    // Branch markers
    sorted.forEach(b => {
      new window.google.maps.Marker({
        position: { lat: b.lat!, lng: b.lng! },
        map,
        title: `${b.pharmacyName} — ${b.name}`,
        icon: { path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 6, fillColor: '#22C55E', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 1 },
      })
    })
    setMapLoaded(true)
  }

  async function loadGoogleMaps(userLat: number, userLng: number, sorted: NearbyBranch[]) {
    if (!apiKey) return
    if (window.google?.maps) { initMap(userLat, userLng, sorted); return }
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Maps'))
      document.head.appendChild(script)
    })
    initMap(userLat, userLng, sorted)
  }

  async function requestGeo() {
    if (!navigator.geolocation) { setGeoState('denied'); return }
    setGeoState('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        const sorted = sortBranches(latitude, longitude)
        // Only send state/CP to backend — never exact coords (LFPDPPP)
        onGeoStateDetected?.('')
        setGeoState('done')
        if (apiKey) loadGoogleMaps(latitude, longitude, sorted)
      },
      () => setGeoState('denied')
    )
  }

  useEffect(() => {
    if (allBranches.length > 0) requestGeo()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns.length])

  if (!apiKey) {
    // Graceful degradation: just show the list without the map
    return (
      <div className="space-y-2">
        {allBranches.slice(0, 5).map(b => (
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
    <div className="space-y-4">
      {geoState === 'idle' && (
        <button onClick={requestGeo} className="text-xs text-primary underline underline-offset-2">
          Usar mi ubicación para encontrar farmacias cercanas
        </button>
      )}
      {geoState === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando farmacias cercanas...
        </div>
      )}
      {geoState === 'denied' && (
        <div className="flex items-center gap-2">
          <input
            value={zipInput}
            onChange={e => setZipInput(e.target.value)}
            placeholder="Código postal"
            maxLength={5}
            className="w-28 px-3 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">para ver farmacias cercanas</span>
        </div>
      )}

      {/* Map container */}
      {geoState === 'done' && apiKey && (
        <div ref={mapRef} className="w-full h-56 rounded-xl overflow-hidden border border-border" />
      )}

      {/* Branch list */}
      {nearbyBranches.length > 0 && (
        <div className="space-y-2">
          {nearbyBranches.map(b => (
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
      )}
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
