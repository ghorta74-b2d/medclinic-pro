// Public routes — no auth required
// Rate-limited at route level (more restrictive than global 200/min)
import type { FastifyInstance } from 'fastify'
import { getPublicRxData } from '../services/rxe.js'
import { selectCampaigns } from '../services/campaign-selector.js'
import { prisma } from '../lib/prisma.js'

export async function publicRoutes(server: FastifyInstance) {
  // GET /api/public/rx/:slug?state=MX-YUC
  // Returns prescription data for the patient landing page + matched ad campaigns
  server.get('/rx/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const { state } = request.query as { state?: string }

    const data = await getPublicRxData(slug)
    if (!data) return reply.status(404).send({ error: 'Receta no encontrada' })

    // Select campaigns even for expired prescriptions (user may still want pharmacies)
    const campaigns = await selectCampaigns(state ?? null)

    // Register impressions for served campaigns (fire-and-forget, non-blocking for response)
    if (campaigns.length > 0 && !data.expired) {
      const ids = campaigns.map(c => c.id)
      Promise.all([
        prisma.$executeRaw`
          UPDATE pharmacy_campaigns SET impressions = impressions + 1
          WHERE id = ANY(${ids}::text[])
        `,
        prisma.campaignEvent.createMany({
          data: ids.map(id => ({
            campaignId: id,
            type: 'IMPRESSION' as const,
            rxSlug: slug,
            geoState: state ?? null,
          })),
        }),
      ]).catch(() => {}) // non-critical
    }

    return reply.send({ data: { ...data, campaigns } })
  })

  // POST /api/public/campaign/:id/click
  // Tracks pharmacy slot click and returns the CTA URL with UTM params
  server.post('/campaign/:id/click', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { rxSlug?: string; geoState?: string }

    const campaign = await prisma.pharmacyCampaign.findUnique({
      where: { id },
      select: { id: true, ctaLink: true, active: true },
    })
    if (!campaign?.active) return reply.status(404).send({ error: 'Campaign not found' })

    // Enrich CTA URL with UTM params for analytics
    const url = new URL(campaign.ctaLink)
    url.searchParams.set('utm_source', 'mediaclinic')
    url.searchParams.set('utm_medium', 'prescription_landing')
    url.searchParams.set('utm_campaign', id)
    if (body.rxSlug) url.searchParams.set('utm_content', body.rxSlug)

    // Track click (fire-and-forget)
    Promise.all([
      prisma.$executeRaw`UPDATE pharmacy_campaigns SET clicks = clicks + 1 WHERE id = ${id}`,
      prisma.campaignEvent.create({
        data: { campaignId: id, type: 'CLICK', rxSlug: body.rxSlug ?? null, geoState: body.geoState ?? null },
      }),
      body.rxSlug
        ? prisma.prescription.findUnique({ where: { publicSlug: body.rxSlug }, select: { id: true } })
            .then(rx => rx
              ? prisma.rxEvent.create({
                  data: { prescriptionId: rx.id, type: 'PHARMACY_CLICK', metadata: { campaignId: id } },
                })
              : null)
        : Promise.resolve(),
    ]).catch(() => {})

    return reply.send({ ctaLink: url.toString() })
  })
}
