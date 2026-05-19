import type { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { prisma } from '../../lib/prisma.js'
import { sendResendEmail } from '../../lib/email.js'

export async function webhookStripe(server: FastifyInstance) {
  const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
    apiVersion: '2024-04-10',
  })

  server.post(
    '/',
    {
      config: { rawBody: true }, // Fastify needs raw body for Stripe signature
    },
    async (request, reply) => {
      const sig = request.headers['stripe-signature'] as string
      const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET']!

      let event: Stripe.Event
      try {
        // @ts-expect-error — raw body available after fastify-raw-body plugin
        event = stripe.webhooks.constructEvent(request.rawBody, sig, webhookSecret)
      } catch {
        return reply.status(400).send('Webhook signature verification failed')
      }

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const pi = event.data.object as Stripe.PaymentIntent
          const invoiceId = pi.metadata['invoiceId']
          if (!invoiceId) break

          const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
          if (!invoice) break

          const amount = pi.amount_received / 100

          await prisma.$transaction([
            prisma.paymentRecord.create({
              data: {
                invoiceId,
                amount,
                method: 'STRIPE_ONLINE',
                stripePaymentId: pi.id,
                reference: pi.id,
              },
            }),
            prisma.invoice.update({
              where: { id: invoiceId },
              data: {
                paidAmount: { increment: amount },
                status: amount >= Number(invoice.total) - Number(invoice.paidAmount) ? 'PAID' : 'PARTIALLY_PAID',
                ...(amount >= Number(invoice.total) - Number(invoice.paidAmount) ? { paidAt: new Date() } : {}),
              },
            }),
          ])
          break
        }

        case 'checkout.session.completed': {
          const cs = event.data.object as Stripe.Checkout.Session
          const plan = cs.metadata?.['plan'] ?? 'desconocido'
          const clinicId = cs.metadata?.['clinicId']
          const buyerEmail = cs.customer_details?.email ?? 'desconocido'
          const planLabels: Record<string, string> = {
            esencial: 'Esencial', profesional: 'Profesional', clinica: 'Clínica', 'clinica-plus': 'Clínica Plus',
          }

          // Upgrade flow: clinicId present in metadata → update plan immediately
          if (clinicId) {
            await prisma.clinic.update({ where: { id: clinicId }, data: { planId: plan } }).catch(() => {})
          }

          await sendResendEmail({
            to: 'gerardo@b2d.mx',
            subject: `💰 ${clinicId ? 'Upgrade' : 'Nueva suscripción'} — Plan ${planLabels[plan] ?? plan}`,
            html: `
              <p style="font-family:sans-serif">
                <strong>${clinicId ? 'Upgrade de plan' : 'Nueva suscripción iniciada'} en Mediaclinic</strong>
              </p>
              <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
                <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Plan</td><td>${planLabels[plan] ?? plan}</td></tr>
                <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Email</td><td>${buyerEmail}</td></tr>
                <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Stripe Customer</td><td>${cs.customer}</td></tr>
                ${clinicId ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Clinic ID</td><td>${clinicId}</td></tr>` : ''}
              </table>
            `,
          }).catch(() => {})
          break
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        case ('payment_link.completed' as any): {
          // Handle payment link completion if needed
          break
        }

        default:
          // Unhandled event type — ignore
          break
      }

      return reply.send({ received: true })
    }
  )
}
