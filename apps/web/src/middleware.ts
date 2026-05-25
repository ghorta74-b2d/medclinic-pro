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

// Clinic-level routes — SUPER_ADMIN must not access them (they have no clinic_id)
const CLINIC_PREFIXES = [
  '/dashboard',
  '/pacientes',
  '/agenda',
  '/recetas',
  '/cobros',
  '/consulta-ia',
  '/expediente',
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

  // ── Clinic routes guard: SUPER_ADMIN has no clinic_id — force to superadmin ─
  const isClinicRoute = CLINIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
  if (isClinicRoute) {
    const role = getRoleFromCookies(request)
    if (role === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/superadmin', request.url))
    }

    // ── STAFF restrictions ───────────────────────────────────────────────────
    const isRestricted = STAFF_BLOCKED_PREFIXES.some(prefix => pathname.startsWith(prefix))
    if (isRestricted && role === 'STAFF') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/superadmin/:path*',
    '/dashboard/:path*',
    '/dashboard',
    '/pacientes/:path*',
    '/agenda/:path*',
    '/recetas/:path*',
    '/cobros/:path*',
    '/consulta-ia/:path*',
    '/expediente/:path*',
    '/configuracion/:path*',
    '/resultados/:path*',
    '/laboratorio/:path*',
    '/telemedicina/:path*',
    '/asistente-ia/:path*',
  ],
}
