import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Rutas públicas — no requieren sesión ────────────────────────────────────
const PUBLIC_EXACT = new Set(['/', '/landing', '/login'])
const PUBLIC_PREFIXES = ['/auth/', '/api/']

// ── Rutas bloqueadas para STAFF (administrativo) ────────────────────────────
const STAFF_BLOCKED_PREFIXES = [
  '/expediente',
  '/recetas',
  '/resultados',
  '/laboratorio',
  '/telemedicina',
  '/asistente-ia',
  '/configuracion',
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas — pasar sin revisión de sesión
  if (isPublic(pathname)) return NextResponse.next()

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Parameters<typeof response.cookies.set>[2] }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    const { data: { session } } = await supabase.auth.getSession()

    // Sin sesión → login
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const role = session.user?.user_metadata?.role as string | undefined

    // STAFF no puede acceder a rutas clínicas
    const isStaffBlocked = STAFF_BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))
    if (isStaffBlocked && role === 'STAFF') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
  } catch {
    // Si el check de sesión falla, redirigir al login por seguridad
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas EXCEPTO:
     * - Archivos estáticos de Next.js (_next/static, _next/image)
     * - Archivos públicos con extensión (svg, png, jpg, mp4, ico, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico|txt|xml)).*)',
  ],
}
