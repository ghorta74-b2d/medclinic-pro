'use client'

import { ShoppingBag } from 'lucide-react'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

interface Props {
  campaignId: string
  ctaLink: string
  ctaLabel: string
  rxSlug: string
}

export function CampaignCta({ campaignId, ctaLink, ctaLabel, rxSlug }: Props) {
  async function handleClick() {
    try {
      const res = await fetch(`${API_URL}/api/public/campaign/${campaignId}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rxSlug }),
      })
      if (res.ok) {
        const json = await res.json()
        window.open(json.ctaLink ?? ctaLink, '_blank', 'noopener,noreferrer')
        return
      }
    } catch { /* fall through */ }
    window.open(ctaLink, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      onClick={handleClick}
      className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold transition-colors"
    >
      <ShoppingBag className="w-3.5 h-3.5" />
      {ctaLabel}
    </button>
  )
}
