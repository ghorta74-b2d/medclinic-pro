// Server-side proxy to Google Places Text Search API
// Keeps GOOGLE_PLACES_API_KEY off the client.
// Caches each unique (query, rounded lat/lng) response for 1 h via Vercel Data Cache.

const RADIUS_METERS = 20_000

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface PlaceResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: { location: { lat: number; lng: number } }
}

async function fetchPlaces(
  query: string,
  lat: number,
  lng: number,
  apiKey: string
): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    query,
    location: `${lat},${lng}`,
    radius: String(RADIUS_METERS),
    language: 'es',
    key: apiKey,
  })
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return []
  const json = await res.json()
  return (json.results ?? []) as PlaceResult[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')
  const queries = searchParams.getAll('q').filter(Boolean)

  if (isNaN(lat) || isNaN(lng) || queries.length === 0) {
    return Response.json({ data: [] })
  }

  const apiKey = process.env['GOOGLE_PLACES_API_KEY']
  if (!apiKey) {
    return Response.json({ data: [], error: 'Places API not configured' }, { status: 503 })
  }

  // Round to 2 decimal places (~1.1 km grid) so Vercel Data Cache reuses results
  // for nearby patients hitting the same area.
  const latR = Math.round(lat * 100) / 100
  const lngR = Math.round(lng * 100) / 100

  const raw = await Promise.all(queries.map(q => fetchPlaces(q, latR, lngR, apiKey)))

  const seen = new Set<string>()
  const branches = raw
    .flat()
    .filter(p => {
      if (seen.has(p.place_id)) return false
      seen.add(p.place_id)
      return true
    })
    .map(p => ({
      placeId: p.place_id,
      name: p.name,
      address: p.formatted_address,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      distanceKm: haversineKm(lat, lng, p.geometry.location.lat, p.geometry.location.lng),
    }))
    .filter(b => b.distanceKm <= RADIUS_METERS / 1000)
    .sort((a, b) => a.distanceKm - b.distanceKm)

  return Response.json({ data: branches })
}
