// Campaign click tracker — server-side redirect
// /api/c?id=<campaignId>&slug=<rxSlug>&fallback=<ctaLink>
//
// Tracks the click server-side (no CORS, no client env vars needed) then
// issues a 302 redirect to the CTA URL enriched with UTM params.
// Falls back to the raw ctaLink if the API call fails.

import { NextResponse } from 'next/server'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id       = searchParams.get('id') ?? ''
  const rxSlug   = searchParams.get('slug') ?? ''
  const fallback = searchParams.get('fallback') ?? ''

  if (!id) {
    return fallback
      ? NextResponse.redirect(fallback)
      : new Response('Missing campaign id', { status: 400 })
  }

  try {
    const res = await fetch(`${API_URL}/api/public/campaign/${id}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rxSlug: rxSlug || undefined }),
      // No caching — each click must reach the API
      cache: 'no-store',
    })

    if (res.ok) {
      const json = await res.json() as { ctaLink?: string }
      const dest = json.ctaLink ?? fallback
      return NextResponse.redirect(dest, { status: 302 })
    }
  } catch {
    // API unreachable — still redirect user
  }

  // Fallback: redirect without tracking
  return fallback
    ? NextResponse.redirect(fallback)
    : new Response('Campaign not found', { status: 404 })
}
