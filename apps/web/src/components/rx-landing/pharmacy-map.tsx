'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap } from 'leaflet'
import type { PharmacyCampaign } from 'medclinic-shared'
import { MapPin, Loader2, Navigation, LocateFixed } from 'lucide-react'

interface PlaceBranch {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  distanceKm: number
}

interface PharmacyMapProps {
  campaigns: PharmacyCampaign[]
}

const PAGE_SIZE = 5

type GeoState = 'idle' | 'requesting' | 'loading' | 'done' | 'denied' | 'unavailable' | 'error'

export function PharmacyMap({ campaigns }: PharmacyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<LeafletMap | null>(null)
  const [branches, setBranches] = useState<PlaceBranch[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [mapReady, setMapReady] = useState(false)
  const [geoState, setGeoState] = useState<GeoState>('idle')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)

  const searchQueries = campaigns.map(c => c.searchQuery).filter((q): q is string => Boolean(q))

  function buildMapsUrl(b: PlaceBranch) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name)}&query_place_id=${b.placeId}`
  }

  async function drawMap(
    center: [number, number],
    userLoc: [number, number] | null,
    zoom: number,
    markers: PlaceBranch[]
  ) {
    if (!mapContainerRef.current) return
    try {
      const L = (await import('leaflet')).default
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
      const map = L.map(mapContainerRef.current, { center, zoom, zoomControl: true, attributionControl: false })
      leafletMapRef.current = map
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd', maxZoom: 20,
      }).addTo(map)

      markers.forEach(b => {
        L.circleMarker([b.lat, b.lng], {
          radius: 8, fillColor: '#22C55E', color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1,
        }).bindPopup(`<strong>${b.name}</strong><br/>${b.address}`).addTo(map)
      })

      if (userLoc) {
        L.circleMarker(userLoc, {
          radius: 9, fillColor: '#3B82F6', color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1,
        }).bindPopup('Tu ubicación').addTo(map)
      }
      setMapReady(true)
    } catch {
      // Map failed silently — list still shows
    }
  }

  // Initialize map centered on Mexico (no geolocation yet)
  useEffect(() => {
    if (searchQueries.length === 0) return
    drawMap([23.6345, -102.5528], null, 5, [])
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQueries.length])

  // Triggered by user tapping the locate button — user gesture ensures Android dialog appears
  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeoState('unavailable')
      return
    }
    setGeoState('requesting')

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords
        setUserPos({ lat: latitude, lng: longitude })
        setGeoState('loading')

        try {
          const params = new URLSearchParams()
          params.set('lat', String(latitude))
          params.set('lng', String(longitude))
          searchQueries.forEach(q => params.append('q', q))

          const res = await fetch(`/api/pharmacy-nearby?${params}`)
          const json = await res.json()
          const data: PlaceBranch[] = json.data ?? []
          setBranches(data)
          setVisibleCount(PAGE_SIZE)
          setGeoState('done')

          drawMap(
            [latitude, longitude],
            [latitude, longitude],
            13,
            data.slice(0, 10)
          )
        } catch {
          setGeoState('error')
        }
      },
      err => {
        if (err.code === 1) setGeoState('denied')        // PERMISSION_DENIED
        else if (err.code === 2) setGeoState('unavailable') // POSITION_UNAVAILABLE
        else setGeoState('denied')                        // TIMEOUT — treat as denied
      },
      { timeout: 15_000, maximumAge: 300_000, enableHighAccuracy: false }
    )
  }, [searchQueries]) // eslint-disable-line react-hooks/exhaustive-deps

  if (searchQueries.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Map container — always visible */}
      <div className="relative w-full rounded-xl overflow-hidden border border-border" style={{ height: '14rem' }}>
        <div ref={mapContainerRef} className="absolute inset-0" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted pointer-events-none">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}
      </div>

      {/* CTA: idle or after denial/error → show locate button */}
      {(geoState === 'idle' || geoState === 'denied' || geoState === 'unavailable' || geoState === 'error') && (
        <button
          onClick={requestLocation}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary/40 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 active:bg-primary/15 transition-colors"
        >
          <LocateFixed className="w-4 h-4" />
          {geoState === 'idle' ? 'Buscar farmacias cerca de mí' : 'Reintentar ubicación'}
        </button>
      )}

      {/* Denied message */}
      {geoState === 'denied' && (
        <p className="text-[11px] text-muted-foreground text-center">
          Ubicación bloqueada. Ve a Ajustes → Chrome → Permisos → Ubicación y actívala para este sitio.
        </p>
      )}
      {geoState === 'unavailable' && (
        <p className="text-[11px] text-muted-foreground text-center">
          GPS no disponible en este momento. Intenta en un lugar con mejor señal.
        </p>
      )}

      {/* Requesting / loading */}
      {(geoState === 'requesting' || geoState === 'loading') && (
        <div className="flex items-center justify-center gap-2 py-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">
            {geoState === 'requesting' ? 'Obteniendo ubicación…' : 'Buscando farmacias cercanas…'}
          </p>
        </div>
      )}

      {/* Results list */}
      {geoState === 'done' && userPos && branches.length === 0 && (
        <p className="text-[11px] text-muted-foreground text-center">
          No se encontraron sucursales en un radio de 20 km.
        </p>
      )}

      {geoState === 'done' && branches.length > 0 && (
        <div className="space-y-2">
          {branches.slice(0, visibleCount).map(b => (
            <a
              key={b.placeId}
              href={buildMapsUrl(b)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 active:bg-muted/60 transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{b.name}</p>
                {b.address && <p className="text-xs text-muted-foreground truncate">{b.address}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {b.distanceKm < 1
                    ? `${(b.distanceKm * 1000).toFixed(0)}m`
                    : `${b.distanceKm.toFixed(1)}km`}
                </span>
                <Navigation className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              </div>
            </a>
          ))}

          {visibleCount < branches.length && (
            <button
              onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
              className="w-full py-2 text-xs text-primary font-medium rounded-lg border border-primary/30 hover:bg-primary/5 active:bg-primary/10 transition-colors"
            >
              Mostrar más ({branches.length - visibleCount} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
