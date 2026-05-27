'use client'

import { ShoppingBag } from 'lucide-react'

interface Props {
  campaignId: string
  ctaLink: string
  ctaLabel: string
  rxSlug: string
}

export function CampaignCta({ campaignId, ctaLink, ctaLabel, rxSlug }: Props) {
  // Click tracking is server-side via /api/c redirect — no CORS, no env vars needed on client
  const trackingUrl =
    `/api/c?id=${encodeURIComponent(campaignId)}` +
    `&slug=${encodeURIComponent(rxSlug)}` +
    `&fallback=${encodeURIComponent(ctaLink)}`

  return (
    <a
      href={trackingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold transition-colors"
    >
      <ShoppingBag className="w-3.5 h-3.5" />
      {ctaLabel}
    </a>
  )
}
