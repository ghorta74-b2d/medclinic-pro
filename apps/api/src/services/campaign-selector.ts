import { prisma } from '../lib/prisma.js'

export async function selectCampaigns(geoState: string | null, limit = 4) {
  const now = new Date()

  const campaigns = await prisma.pharmacyCampaign.findMany({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    include: {
      pharmacy: { select: { name: true, logoUrl: true, websiteUrl: true } },
      branches: { select: { id: true, name: true, address: true, lat: true, lng: true, phone: true } },
    },
    orderBy: { priority: 'desc' },
  })

  // Filter by geo: empty geoStates = nacional; otherwise match requested state
  const filtered = geoState
    ? campaigns.filter(c => c.geoStates.length === 0 || c.geoStates.includes(geoState))
    : campaigns.filter(c => c.geoStates.length === 0)

  return filtered.slice(0, limit)
}
