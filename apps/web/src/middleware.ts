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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only check STAFF restrictions for known restricted paths
  const isRestricted = STAFF_BLOCKED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  if (!isRestricted) return NextResponse.next()

  try {
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

    const { data: { session } } = await supabase.auth.getSession()
    const role = session?.user?.user_metadata?.role as string | undefined

    // Redirect STAFF to dashboard for restricted routes
    if (role === 'STAFF') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
  } catch {
    // If session check fails, allow through (don't accidentally block legitimate users)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/expediente/:path*',
    '/recetas/:path*',
    '/resultados/:path*',
    '/laboratorio/:path*',
    '/telemedicina/:path*',
    '/asistente-ia/:path*',
    '/configuracion/:path*',
  ],
}
