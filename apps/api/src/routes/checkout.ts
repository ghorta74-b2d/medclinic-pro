import Stripe from 'stripe'
import type { FastifyPluginAsync } from 'fastify'

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, { apiVersion: '2024-04-10' })

const BASE_URL = process.env['APP_BASE_URL'] ?? 'https://medclinic-web.vercel.app'

const PRICE_MAP: Record<string, { monthly: string; annual: string }> = {
  esencial: {
    monthly: process.env['STRIPE_PRICE_ESENCIAL_MONTHLY'] ?? '',
    annual:  process.env['STRIPE_PRICE_ESENCIAL_ANNUAL']  ?? '',
  },
  profesional: {
    monthly: process.env['STRIPE_PRICE_PROFESIONAL_MONTHLY'] ?? '',
    annual:  process.env['STRIPE_PRICE_PROFESIONAL_ANNUAL']  ?? '',
  },
  clinica: {
    monthly: process.env['STRIPE_PRICE_CLINICA_MONTHLY'] ?? '',
    annual:  process.env['STRIPE_PRICE_CLINICA_ANNUAL']  ?? '',
  },
}

export const checkoutRoutes: FastifyPluginAsync = async (server) => {
  server.post('/session', async (request, reply) => {
    const { plan, annual } = request.body as { plan: string; annual: boolean }

    const prices = PRICE_MAP[plan]
    if (!prices) {
      return reply.status(400).send({ error: 'Plan inválido' })
    }

    const priceId = annual ? prices.annual : prices.monthly
    if (!priceId) {
      return reply.status(503).send({ error: 'Plan no disponible. Contacta a soporte.' })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/?checkout=success&plan=${plan}`,
      cancel_url: `${BASE_URL}/#precios`,
      allow_promotion_codes: true,
      locale: 'es',
      subscription_data: {
        metadata: { plan },
      },
    })

    return reply.send({ url: session.url })
  })
}
