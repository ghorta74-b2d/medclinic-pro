// Admin routes for pharmacy & campaign management (ad-manager)
// Pharmacies are platform-level (no clinicId) — managed by SUPER_ADMIN
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAdmin, requireRoles } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'

const PharmacySchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  active: z.boolean().optional(),
})

const BranchSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  phone: z.string().optional(),
})

const CampaignSchema = z.object({
  pharmacyId: z.string(),
  displayName: z.string().min(1),
  description: z.string().optional(),
  ctaLink: z.string().url(),
  ctaLabel: z.string().default('Comprar'),
  displayPhone: z.string().optional(),
  priority: z.number().int().min(0).default(0),
  geoStates: z.array(z.string()).default([]),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  active: z.boolean().default(true),
  pricingModel: z.enum(['CPM', 'CPC', 'FLAT_MONTHLY']).default('FLAT_MONTHLY'),
  rateCents: z.number().int().min(0).default(0),
  stripePriceId: z.string().optional(),
})

export async function pharmaciesRoutes(server: FastifyInstance) {
  // ── Pharmacies CRUD ─────────────────────────────────────────

  server.get('/', { preHandler: requireAdmin }, async (_req, reply) => {
    const pharmacies = await prisma.pharmacy.findMany({
      include: { branches: true, campaigns: { select: { id: true, displayName: true, active: true, impressions: true, clicks: true } } },
      orderBy: { name: 'asc' },
    })
    return reply.send({ data: pharmacies })
  })

  server.post('/', { preHandler: requireRoles('SUPER_ADMIN') }, async (request, reply) => {
    const parsed = PharmacySchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const pharmacy = await prisma.pharmacy.create({ data: parsed.data })
    return reply.status(201).send({ data: pharmacy })
  })

  server.patch('/:id', { preHandler: requireRoles('SUPER_ADMIN') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = PharmacySchema.partial().safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const pharmacy = await prisma.pharmacy.update({ where: { id }, data: parsed.data })
    return reply.send({ data: pharmacy })
  })

  // ── Branches ────────────────────────────────────────────────

  server.get('/:id/branches', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const branches = await prisma.pharmacyBranch.findMany({ where: { pharmacyId: id } })
    return reply.send({ data: branches })
  })

  server.post('/:id/branches', { preHandler: requireRoles('SUPER_ADMIN') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = BranchSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const branch = await prisma.pharmacyBranch.create({ data: { pharmacyId: id, ...parsed.data } })
    return reply.status(201).send({ data: branch })
  })

  // ── Campaigns CRUD ──────────────────────────────────────────

  server.get('/campaigns', { preHandler: requireAdmin }, async (_req, reply) => {
    const campaigns = await prisma.pharmacyCampaign.findMany({
      include: { pharmacy: { select: { name: true, logoUrl: true } } },
      orderBy: [{ active: 'desc' }, { priority: 'desc' }],
    })
    return reply.send({ data: campaigns })
  })

  server.post('/campaigns', { preHandler: requireRoles('SUPER_ADMIN') }, async (request, reply) => {
    const parsed = CampaignSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const data = parsed.data
    const campaign = await prisma.pharmacyCampaign.create({
      data: {
        ...data,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      },
    })
    return reply.status(201).send({ data: campaign })
  })

  server.patch('/campaigns/:id', { preHandler: requireRoles('SUPER_ADMIN') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = CampaignSchema.partial().safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const data = parsed.data
    const campaign = await prisma.pharmacyCampaign.update({
      where: { id },
      data: {
        ...data,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      },
    })
    return reply.send({ data: campaign })
  })

  // ── Campaign Metrics ────────────────────────────────────────

  server.get('/campaigns/:id/metrics', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { days = '30' } = request.query as { days?: string }

    const campaign = await prisma.pharmacyCampaign.findUnique({
      where: { id },
      select: { id: true, displayName: true, impressions: true, clicks: true, rateCents: true, pricingModel: true },
    })
    if (!campaign) return Errors.NOT_FOUND(reply, 'Campaign')

    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000)

    const eventsByDay = await prisma.$queryRaw<Array<{ day: string; impressions: bigint; clicks: bigint }>>`
      SELECT
        DATE(created_at)::text AS day,
        COUNT(*) FILTER (WHERE type = 'IMPRESSION') AS impressions,
        COUNT(*) FILTER (WHERE type = 'CLICK') AS clicks
      FROM campaign_events
      WHERE campaign_id = ${id} AND created_at >= ${since}
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `

    const ctr = campaign.impressions > 0
      ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
      : '0.00'

    const estimatedRevenueCents = campaign.pricingModel === 'CPM'
      ? Math.floor((campaign.impressions / 1000) * campaign.rateCents)
      : campaign.pricingModel === 'CPC'
      ? campaign.clicks * campaign.rateCents
      : campaign.rateCents // FLAT_MONTHLY: tarifa fija

    return reply.send({
      data: {
        ...campaign,
        ctr,
        estimatedRevenueCents,
        eventsByDay: eventsByDay.map(r => ({
          day: r.day,
          impressions: Number(r.impressions),
          clicks: Number(r.clicks),
        })),
      },
    })
  })
}
