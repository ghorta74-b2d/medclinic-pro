import crypto from 'crypto'
import { z } from 'zod'
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { supabase } from '../lib/supabase.js'
import { buildPasswordResetEmail, sendResendEmail } from '../lib/email.js'
import { generateResetToken, hashToken, getTokenExpiry } from '../services/token.service.js'
import { auditLog } from '../middleware/audit.js'

const GENERIC_OK = { message: 'Si el correo está registrado, recibirás las instrucciones en unos minutos' }
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX = 3

export const authRoutes: FastifyPluginAsync = async (server) => {
  // ── POST /api/auth/forgot-password ────────────────────────────────────────
  server.post('/forgot-password', async (request, reply) => {
    const schema = z.object({ email: z.string().email() })
    const parsed = schema.safeParse(request.body)
    if (!parsed.success) return reply.status(200).send(GENERIC_OK)

    const { email } = parsed.data
    const ip = request.ip
    const ua = request.headers['user-agent'] ?? ''
    const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')

    server.log.info({ emailHash, ip, ua, event: 'PASSWORD_RESET_REQUEST' })

    const doctor = await prisma.doctor.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, firstName: true, email: true, authUserId: true },
    })

    // Always return 200 — never reveal if email exists
    if (!doctor || !doctor.authUserId) return reply.status(200).send(GENERIC_OK)

    // DB-based rate limit: max 3 tokens per doctor in the last 15 minutes
    const recentCount = await prisma.passwordResetToken.count({
      where: {
        doctorId: doctor.id,
        createdAt: { gt: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      },
    })
    if (recentCount >= RATE_LIMIT_MAX) return reply.status(200).send(GENERIC_OK)

    // Invalidate any existing unused tokens
    await prisma.passwordResetToken.deleteMany({
      where: { doctorId: doctor.id, usedAt: null },
    })

    const { token, tokenHash } = generateResetToken()

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        doctorId: doctor.id,
        expiresAt: getTokenExpiry(1),
        ipAddress: ip,
        userAgent: typeof ua === 'string' ? ua : ua[0],
      },
    })

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
    const resetLink = `${appUrl}/auth/reset-password?token=${token}`

    await sendResendEmail({
      to: doctor.email,
      subject: 'Recupera tu contraseña — Mediaclinic',
      html: buildPasswordResetEmail({ firstName: doctor.firstName, resetLink }),
    }).catch(() => {})

    return reply.status(200).send(GENERIC_OK)
  })

  // ── GET /api/auth/reset-password/validate ─────────────────────────────────
  server.get('/reset-password/validate', async (request, reply) => {
    const { token } = request.query as { token?: string }
    if (!token) return reply.send({ valid: false })

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    })

    const valid =
      !!record &&
      record.expiresAt > new Date() &&
      record.usedAt === null

    return reply.send({ valid })
  })

  // ── POST /api/auth/reset-password ─────────────────────────────────────────
  server.post('/reset-password', async (request, reply) => {
    const schema = z
      .object({
        token: z.string().min(1),
        password: z.string().regex(/^(?=.*[A-Z])(?=.*\d).{8,}$/, {
          message: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número',
        }),
        confirmPassword: z.string(),
      })
      .refine((d) => d.password === d.confirmPassword, {
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
      })

    const parsed = schema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Datos inválidos', details: parsed.error.flatten() })
    }

    const { token, password } = parsed.data
    const ip = request.ip
    const ua = request.headers['user-agent'] ?? ''

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        doctor: {
          select: { id: true, authUserId: true, clinicId: true, role: true },
        },
      },
    })

    const isValid =
      !!record &&
      record.expiresAt > new Date() &&
      record.usedAt === null &&
      !!record.doctor.authUserId

    if (!isValid) {
      return reply.status(400).send({ error: 'El enlace no es válido o ya fue utilizado' })
    }

    // Update password via Supabase Auth Admin API
    const { error: supabaseError } = await supabase.auth.admin.updateUserById(
      record.doctor.authUserId!,
      { password },
    )

    if (supabaseError) {
      server.log.error({ event: 'PASSWORD_RESET_SUPABASE_ERROR', error: supabaseError.message })
      return reply.status(500).send({ error: 'No se pudo actualizar la contraseña. Intenta de nuevo.' })
    }

    // Mark token as used and clean up all tokens for this doctor
    await prisma.passwordResetToken.updateMany({
      where: { id: record.id },
      data: { usedAt: new Date() },
    })
    await prisma.passwordResetToken.deleteMany({
      where: { doctorId: record.doctorId, id: { not: record.id } },
    })

    // Audit log — reconstruct AuthUser from doctor record
    await auditLog({
      user: {
        authUserId: record.doctor.authUserId!,
        clinicId: record.doctor.clinicId,
        role: record.doctor.role,
        doctorId: record.doctor.id,
      },
      action: 'UPDATE',
      resourceType: 'Doctor',
      resourceId: record.doctor.id,
      metadata: { event: 'PASSWORD_RESET_SUCCESS' },
      ip,
      userAgent: typeof ua === 'string' ? ua : ua[0],
    }).catch(() => {})

    return reply.send({ success: true, message: 'Contraseña actualizada correctamente' })
  })
}
