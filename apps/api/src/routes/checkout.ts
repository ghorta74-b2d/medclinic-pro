import Stripe from 'stripe'
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { supabase } from '../lib/supabase.js'
import { buildInviteEmail, sendResendEmail } from '../lib/email.js'
import type { Role } from '../../generated/index.js'

export const checkoutRoutes: FastifyPluginAsync = async (server) => {
  // ── POST /api/checkout/session ────────────────────────────────────────────
  server.post('/session', async (request, reply) => {
    const { plan, annual } = request.body as { plan: string; annual: boolean }

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

    console.log('[checkout] plan=%s annual=%s esencial_monthly=%s', plan, annual, process.env['STRIPE_PRICE_ESENCIAL_MONTHLY'])

    const prices = PRICE_MAP[plan]
    if (!prices) {
      return reply.status(400).send({ error: 'Plan inválido' })
    }

    const priceId = annual ? prices.annual : prices.monthly
    if (!priceId) {
      console.error('[checkout] priceId vacío para plan=%s annual=%s', plan, annual)
      return reply.status(503).send({ error: 'Plan no disponible. Contacta a soporte.' })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // {CHECKOUT_SESSION_ID} is replaced automatically by Stripe
      success_url: `${BASE_URL}/thank-you?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE_URL}/#precios`,
      allow_promotion_codes: true,
      locale: 'es-419',
      metadata: { plan },
      subscription_data: { trial_period_days: 14, metadata: { plan } },
    })

    return reply.send({ url: session.url })
  })

  // ── POST /api/checkout/onboard ────────────────────────────────────────────
  // Called from the /thank-you page after payment to create the clinic and
  // send the admin invite. No auth required — session_id is the trust anchor.
  server.post('/onboard', async (request, reply) => {
    const { sessionId, clinicName, firstName, lastName, adminEmail } = request.body as {
      sessionId: string
      clinicName: string
      firstName: string
      lastName: string
      adminEmail: string
    }

    if (!sessionId || !clinicName || !firstName || !lastName || !adminEmail) {
      return reply.status(400).send({ error: 'Todos los campos son requeridos' })
    }

    // 1. Verify session with Stripe
    const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, { apiVersion: '2024-04-10' })
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
    } catch {
      return reply.status(400).send({ error: 'Sesión de pago inválida' })
    }

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return reply.status(402).send({ error: 'El pago no se ha completado' })
    }

    const customerId = session.customer as string
    const plan = (session.metadata?.['plan'] ?? 'esencial') as string

    // 2. Idempotency — return early if already onboarded
    const existing = await prisma.clinic.findFirst({ where: { stripeAccountId: customerId } })
    if (existing) return reply.send({ ok: true, alreadyOnboarded: true })

    // 3. Create Clinic
    const clinic = await prisma.clinic.create({
      data: {
        name: clinicName,
        planId: plan,
        stripeAccountId: customerId,
        isActive: true,
      },
    })

    // 4. Create Doctor ADMIN
    let doctor: Awaited<ReturnType<typeof prisma.doctor.create>> | null = null
    try {
      doctor = await prisma.doctor.create({
        data: {
          clinicId: clinic.id,
          firstName,
          lastName,
          email: adminEmail,
          role: 'ADMIN' as Role,
          isActive: true,
          scheduleConfig: {
            monday:    { start: '09:00', end: '18:00', enabled: true },
            tuesday:   { start: '09:00', end: '18:00', enabled: true },
            wednesday: { start: '09:00', end: '18:00', enabled: true },
            thursday:  { start: '09:00', end: '18:00', enabled: true },
            friday:    { start: '09:00', end: '18:00', enabled: true },
            saturday:  { start: '09:00', end: '14:00', enabled: false },
            sunday:    { start: '09:00', end: '14:00', enabled: false },
          },
        },
      })
    } catch {
      await prisma.clinic.delete({ where: { id: clinic.id } }).catch(() => {})
      return reply.status(400).send({ error: 'No se pudo crear el usuario administrador' })
    }

    // 5. Generate Supabase invite link
    const redirectTo = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://mediaclinic.mx'}/auth/invite`
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: adminEmail,
      options: {
        data: {
          clinic_id: clinic.id,
          role: 'ADMIN',
          firstName,
          lastName,
          doctor_id: doctor.id,
        },
        redirectTo,
      },
    })

    if (linkError) {
      await prisma.doctor.delete({ where: { id: doctor.id } }).catch(() => {})
      await prisma.clinic.delete({ where: { id: clinic.id } }).catch(() => {})
      return reply.status(400).send({ error: linkError.message })
    }

    // 6. Link authUserId to Doctor record
    if (linkData?.user?.id) {
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { authUserId: linkData.user.id },
      }).catch(() => {})
    }

    // 7. Send emails in parallel
    const actionLink = linkData?.properties?.action_link
    const planLabels: Record<string, string> = {
      esencial: 'Esencial', profesional: 'Profesional', clinica: 'Clínica',
    }

    await Promise.all([
      // Invite email → new admin
      actionLink ? sendResendEmail({
        to: adminEmail,
        subject: 'Activa tu cuenta de MedClinic PRO',
        html: buildInviteEmail({ firstName, email: adminEmail, role: 'ADMIN', actionLink }),
      }).catch(() => {}) : Promise.resolve(),

      // Notification → Gerardo
      sendResendEmail({
        to: 'gerardo@b2d.mx',
        subject: `Nueva venta — Plan ${planLabels[plan] ?? plan} — ${clinicName}`,
        html: `
          <p style="font-family:sans-serif">
            <strong>Nueva clínica onboardeada en MedClinic PRO</strong>
          </p>
          <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Clínica</td><td><strong>${clinicName}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Plan</td><td>${planLabels[plan] ?? plan}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Admin</td><td>${firstName} ${lastName}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Email admin</td><td>${adminEmail}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Stripe customer</td><td>${customerId}</td></tr>
          </table>
          <p style="font-family:sans-serif;color:#6b7280;font-size:13px;margin-top:16px">
            Invitación de activación enviada a ${adminEmail}.
          </p>
        `,
      }).catch(() => {}),
    ])

    return reply.send({ ok: true })
  })

  // ── POST /api/checkout/resend-invite ─────────────────────────────────────
  // Self-service: resend activation email when the link expires.
  // No auth — email is the trust anchor (only doctors already in DB get a link).
  server.post('/resend-invite', async (request, reply) => {
    const { email } = request.body as { email: string }
    if (!email) return reply.status(400).send({ error: 'Email requerido' })

    const doctor = await prisma.doctor.findFirst({
      where: { email: email.toLowerCase().trim() },
    })
    if (!doctor) {
      return reply.status(404).send({ error: 'No encontramos una cuenta con ese correo.' })
    }

    // Block resend if the account is already activated (confirmed_at set in Supabase).
    // Prevents using an expired invite URL to overwrite credentials of an active account.
    if (doctor.authUserId) {
      const { data: userData } = await supabase.auth.admin.getUserById(doctor.authUserId)
      if (userData?.user?.confirmed_at) {
        return reply.status(409).send({
          error: 'Esta cuenta ya está activa. Inicia sesión en mediaclinic.mx.',
        })
      }
    }

    const redirectTo = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://mediaclinic.mx'}/auth/invite`
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: doctor.email,
      options: {
        data: {
          clinic_id: doctor.clinicId,
          role: doctor.role,
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          doctor_id: doctor.id,
        },
        redirectTo,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      return reply.status(400).send({ error: 'No se pudo generar el nuevo enlace.' })
    }

    await sendResendEmail({
      to: doctor.email,
      subject: 'Tu nuevo enlace de activación — Mediaclinic',
      html: buildInviteEmail({
        firstName: doctor.firstName,
        email: doctor.email,
        role: doctor.role,
        actionLink: linkData.properties.action_link,
        isResend: true,
      }),
    }).catch(() => {})

    return reply.send({ ok: true })
  })
}
