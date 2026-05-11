import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that STAFF (administrativo) cannot access
const STAFF_BLOCKED_PREFIXES = [
  '/expediente',
  '/recetas',
  '/resultados',
  '/laboratorio',
  '/telemedicina',
  '/asistente-ia',
  '/configuracion',
]

/**
 * Decode the role from the Supabase access-token JWT without any network call.
 * We only need the role for routing decisions — actual auth is enforced by the API.
 */
function getRoleFromCookies(request: NextRequest): string | undefined {
  try {
    // Supabase SSR stores the token in a cookie named sb-<project>-auth-token
    // which is a JSON string: [access_token, refresh_token, ...]
    // Alternatively the cookie can just be the access_token string directly.
    for (const cookie of request.cookies.getAll()) {
      if (!cookie.name.includes('auth-token')) continue
      let token = cookie.value
      // If value is a JSON array, pull the first element (access_token)
      try {
        const parsed = JSON.parse(token)
        if (Array.isArray(parsed)) token = parsed[0]
        else if (parsed?.access_token) token = parsed.access_token
      } catch { /* not JSON — value is already the raw JWT */ }

      // Decode JWT payload (no signature verification — just routing)
      const parts = token.split('.')
      if (parts.length !== 3) continue
      const payload = JSON.parse(atob((parts[1] as string).replace(/-/g, '+').replace(/_/g, '/')))
      return payload?.user_metadata?.role as string | undefined
    }
  } catch { /* malformed cookie — treat as unauthenticated */ }
  return undefined
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Superadmin guard: SUPER_ADMIN role required ────────────────────────────
  if (pathname.startsWith('/superadmin')) {
    const role = getRoleFromCookies(request)
    if (role !== 'SUPER_ADMIN') {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // ── STAFF restrictions ─────────────────────────────────────────────────────
  const isRestricted = STAFF_BLOCKED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  if (!isRestricted) return NextResponse.next()

  const role = getRoleFromCookies(request)
  if (role === 'STAFF') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/superadmin/:path*',
    '/expediente/:path*',
    '/recetas/:path*',
    '/resultados/:path*',
    '/laboratorio/:path*',
    '/telemedicina/:path*',
    '/asistente-ia/:path*',
    '/configuracion/:path*',
  ],
}
