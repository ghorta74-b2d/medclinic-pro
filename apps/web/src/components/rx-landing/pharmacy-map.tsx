'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap } from 'leaflet'
import type { PharmacyCampaign } from 'medclinic-shared'
import { MapPin, Loader2, Navigation } from 'lucide-react'

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

export function PharmacyMap({ campaigns }: PharmacyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<LeafletMap | null>(null)
  const [branches, setBranches] = useState<PlaceBranch[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  // null = pending; undefined = denied/unavailable
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null | undefined>(null)

  const searchQueries = campaigns.map(c => c.searchQuery).filter((q): q is string => Boolean(q))

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
      setMapState('ready')
    } catch {
      setMapState('error')
    }
  }

  function buildMapsUrl(b: PlaceBranch) {
    // Abre la ubicación de la sucursal sin ruta — compatible iOS/Android
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name)}&query_place_id=${b.placeId}`
  }

  useEffect(() => {
    if (searchQueries.length === 0) return
    let cancelled = false

    // Initial map: center of Mexico while we wait for geolocation
    drawMap([23.6345, -102.5528], null, 5, [])

    if (!navigator.geolocation) {
      setUserPos(undefined)
      setFetchState('done')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async pos => {
        if (cancelled) return
        const { latitude, longitude } = pos.coords
        setUserPos({ lat: latitude, lng: longitude })
        setFetchState('loading')

        try {
          const params = new URLSearchParams()
          params.set('lat', String(latitude))
          params.set('lng', String(longitude))
          searchQueries.forEach(q => params.append('q', q))

          const res = await fetch(`/api/pharmacy-nearby?${params}`)
          if (cancelled) return
          const json = await res.json()
          const data: PlaceBranch[] = json.data ?? []
          setBranches(data)
          setVisibleCount(PAGE_SIZE)
          setFetchState('done')

          // Redraw map with real user position + branch markers
          drawMap(
            [latitude, longitude],
            [latitude, longitude],
            13,
            data.slice(0, 10)  // show first 10 on map
          )
        } catch {
          if (!cancelled) setFetchState('error')
        }
      },
      () => {
        if (!cancelled) {
          setUserPos(undefined)
          setFetchState('done')
        }
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

  if (searchQueries.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="relative w-full rounded-xl overflow-hidden border border-border" style={{ height: '14rem' }}>
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

      {/* Status hints */}
      {userPos === null && (
        <p className="text-[11px] text-muted-foreground">
          Permite el acceso a tu ubicación para ver las farmacias más cercanas.
        </p>
      )}
      {userPos === undefined && (
        <p className="text-[11px] text-muted-foreground">
          Activa la ubicación para buscar farmacias en tu área.
        </p>
      )}

      {/* Fetching */}
      {fetchState === 'loading' && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Buscando farmacias cercanas…</p>
        </div>
      )}

      {/* Results */}
      {fetchState === 'done' && userPos && branches.length === 0 && (
        <p className="text-[11px] text-muted-foreground">No se encontraron sucursales en un radio de 20 km.</p>
      )}

      {fetchState === 'done' && branches.length > 0 && (
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

      {fetchState === 'error' && (
        <p className="text-[11px] text-muted-foreground">No se pudo cargar la información de farmacias.</p>
      )}
    </div>
  )
}
