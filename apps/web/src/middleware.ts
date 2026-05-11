import { createServerClient } from '@supabase/ssr'
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

function makeSupabase(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Parameters<typeof response.cookies.set>[2] }[]) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // ── Superadmin guard: require active SUPER_ADMIN session ───────────────────
  if (pathname.startsWith('/superadmin')) {
    try {
      const supabase = makeSupabase(request, response)
      const { data: { session } } = await supabase.auth.getSession()
      const role = session?.user?.user_metadata?.role as string | undefined
      if (!session || role !== 'SUPER_ADMIN') {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(loginUrl)
      }
    } catch {
      // On error allow through — don't lock out on transient Supabase failures
    }
    return response
  }

  // ── STAFF restrictions ─────────────────────────────────────────────────────
  const isRestricted = STAFF_BLOCKED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  if (!isRestricted) return NextResponse.next()

  try {
    const supabase = makeSupabase(request, response)
    const { data: { session } } = await supabase.auth.getSession()
    const role = session?.user?.user_metadata?.role as string | undefined
    if (role === 'STAFF') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  } catch {
    return NextResponse.next()
  }
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
