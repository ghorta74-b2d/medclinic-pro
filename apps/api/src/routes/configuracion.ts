import type { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../lib/prisma.js'
import { Errors } from '../lib/errors.js'
import { authenticate } from '../middleware/auth.js'
import type { Role } from '../../generated/index.js'

// ── Supabase admin client (bypasses RLS, can invite users) ───────────────────
function getSupabaseAdmin() {
  return createClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Email template ────────────────────────────────────────────────────────────
function buildInviteEmail(opts: {
  firstName: string
  email: string
  role: string
  actionLink: string
  isResend?: boolean
}) {
  const roleLabel = opts.role === 'ADMIN' ? 'Administrador' : opts.role === 'DOCTOR' ? 'Médico' : 'Administrativo'
  const headline  = opts.isResend ? 'Tu acceso a MedClinic PRO' : 'Bienvenido a MedClinic PRO'
  const body      = opts.isResend
    ? 'Tu administrador te reenvió el acceso. Haz clic en el botón para establecer tu contraseña.'
    : 'Has sido invitado a unirte a <strong>MedClinic PRO</strong>. Haz clic en el botón para activar tu cuenta y establecer tu contraseña.'

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:36px 40px;text-align:center">
            <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">MedClinic PRO</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75)">Plataforma de gestión clínica</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 28px">
            <p style="margin:0 0 6px;font-size:22px;font-weight:600;color:#1e1b4b">Hola ${opts.firstName},</p>
            <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.65">${body}</p>

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px">
              <tr>
                <td style="background:#7c3aed;border-radius:10px">
                  <a href="${opts.actionLink}"
                     style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px">
                    ${opts.isResend ? 'Establecer contraseña →' : 'Activar mi cuenta →'}
                  </a>
                </td>
              </tr>
            </table>

            <!-- Info card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff;border:1px solid #e8e4fb;border-radius:10px;padding:18px 20px">
              <tr>
                <td>
                  <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px">Tus datos de acceso</p>
                  <p style="margin:0 0 5px;font-size:13px;color:#374151">📧 &nbsp;<strong>${opts.email}</strong></p>
                  <p style="margin:0;font-size:13px;color:#374151">👤 &nbsp;${roleLabel}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #f3f4f6;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
              El enlace expira en 24 horas.<br>
              Si no esperabas esta invitación, puedes ignorar este mensaje.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Plan limits ───────────────────────────────────────────────────────────────
const LIMITS = {
  BASIC:      { DOCTOR: 1,  STAFF: 1 },
  PRO:        { DOCTOR: 4,  STAFF: 1 },
  ENTERPRISE: { DOCTOR: 15, STAFF: 5 },
} as const

type PlanKey = keyof typeof LIMITS

function getLimits(planId: string | null | undefined) {
  return LIMITS[(planId as PlanKey) ?? 'BASIC'] ?? LIMITS['BASIC']
}

// ── Plugin ────────────────────────────────────────────────────────────────────
export const configuracionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate)

  // ── GET /api/configuracion/clinic ─────────────────────────────────────────
  fastify.get('/clinic', async (request, reply) => {
    const { clinicId } = request.authUser

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } })
    if (!clinic) return Errors.NOT_FOUND(reply, 'Clínica')

    return { data: clinic }
  })

  // ── PATCH /api/configuracion/clinic ───────────────────────────────────────
  fastify.patch('/clinic', async (request, reply) => {
    const { clinicId } = request.authUser
    const body = request.body as {
      name?: string
      rfc?: string
      phone?: string
      email?: string
      address?: string
    }

    const clinic = await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        ...(body.name    !== undefined && { name:    body.name }),
        ...(body.rfc     !== undefined && { rfc:     body.rfc }),
        ...(body.phone   !== undefined && { phone:   body.phone }),
        ...(body.email   !== undefined && { email:   body.email }),
        ...(body.address !== undefined && { address: body.address }),
      },
    })

    return { data: clinic }
  })

  // ── GET /api/configuracion/schedule ──────────────────────────────────────
  // Returns the authenticated doctor's schedule config
  fastify.get('/schedule', async (request, reply) => {
    const { clinicId, authUserId } = request.authUser

    const doctor = await prisma.doctor.findFirst({
      where: { clinicId, authUserId },
      select: { id: true, scheduleConfig: true, consultationDuration: true },
    })
    if (!doctor) return Errors.NOT_FOUND(reply, 'Doctor')

    const DEFAULT_SCHEDULE = {
      mon: [{ start: '09:00', end: '19:00' }],
      tue: [{ start: '09:00', end: '19:00' }],
      wed: [{ start: '09:00', end: '19:00' }],
      thu: [{ start: '09:00', end: '19:00' }],
      fri: [{ start: '09:00', end: '19:00' }],
      sat: [{ start: '09:00', end: '15:00' }],
    }

    return {
      data: {
        doctorId: doctor.id,
        scheduleConfig: (doctor.scheduleConfig as Record<string, { start: string; end: string }[]> | null) ?? DEFAULT_SCHEDULE,
        consultationDuration: doctor.consultationDuration || 30,
      },
    }
  })

  // ── PATCH /api/configuracion/schedule ─────────────────────────────────────
  // Allows a doctor/admin to update their schedule
  fastify.patch('/schedule', async (request, reply) => {
    const { clinicId, authUserId, role } = request.authUser

    // Only DOCTOR and ADMIN can update schedule
    if (!['DOCTOR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return Errors.FORBIDDEN(reply)
    }

    const body = request.body as {
      scheduleConfig?: Record<string, { start: string; end: string }[]>
      consultationDuration?: number
      doctorId?: string // ADMIN can update another doctor's schedule
    }

    // Find the doctor record
    const doctor = body.doctorId && ['ADMIN', 'SUPER_ADMIN'].includes(role)
      ? await prisma.doctor.findFirst({ where: { id: body.doctorId, clinicId } })
      : await prisma.doctor.findFirst({ where: { clinicId, authUserId } })

    if (!doctor) return Errors.NOT_FOUND(reply, 'Doctor')

    const updated = await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        ...(body.scheduleConfig !== undefined && { scheduleConfig: body.scheduleConfig }),
        ...(body.consultationDuration !== undefined && { consultationDuration: body.consultationDuration }),
      },
      select: { id: true, scheduleConfig: true, consultationDuration: true },
    })

    return { data: updated }
  })

  // ── GET /api/configuracion/doctors ────────────────────────────────────────
  // Returns only active DOCTOR/ADMIN users (excludes STAFF — they have a Doctor
  // record but are not medical staff). Filters directly via the role column —
  // no Supabase Auth round-trip needed.
  fastify.get('/doctors', async (request) => {
    const { clinicId } = request.authUser

    const doctors = await prisma.doctor.findMany({
      where: { clinicId, isActive: true, role: { not: 'STAFF' } },
      orderBy: { createdAt: 'asc' },
    })

    return { data: doctors }
  })

  // ── POST /api/configuracion/doctors ───────────────────────────────────────
  // Legacy: create doctor (kept for backwards compatibility)
  fastify.post('/doctors', async (request, reply) => {
    const { clinicId } = request.authUser
    const body = request.body as {
      firstName: string
      lastName: string
      email: string
      specialty: string
      licenseNumber: string
      role?: string
    }

    const supabaseAdmin = getSupabaseAdmin()

    const doctor = await prisma.doctor.create({
      data: {
        clinicId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        specialty: body.specialty,
        licenseNumber: body.licenseNumber,
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

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      body.email,
      {
        data: {
          clinic_id: clinicId,
          role: body.role ?? 'DOCTOR',
          firstName: body.firstName,
          lastName: body.lastName,
          doctor_id: doctor.id,
        },
        redirectTo: `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/auth/invite`,
      }
    )

    if (inviteError) {
      await prisma.doctor.delete({ where: { id: doctor.id } }).catch(() => {})
      return reply.status(400).send({ error: { message: inviteError.message } })
    }

    if (inviteData?.user?.id) {
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { authUserId: inviteData.user.id },
      }).catch(() => {})
    }

    return reply.status(201).send({ data: { doctor, inviteSent: true } })
  })

  // ── GET /api/configuracion/users ──────────────────────────────────────────
  // Returns all users (doctors + staff) with plan info and quota
  fastify.get('/users', async (request, reply) => {
    const { clinicId } = request.authUser

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } })
    if (!clinic) return Errors.NOT_FOUND(reply, 'Clínica')

    const users = await prisma.doctor.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'asc' },
    })

    const plan = clinic.planId ?? 'BASIC'
    const limits = getLimits(plan)

    const doctorCount = users.filter(u => u.role === 'DOCTOR' || u.role === 'ADMIN').length
    const staffCount  = users.filter(u => u.role === 'STAFF').length

    return { data: { users, plan, limits, doctorCount, staffCount } }
  })

  // ── POST /api/configuracion/users/invite ──────────────────────────────────
  // Invite a new user with role validation and plan limit check
  fastify.post('/users/invite', async (request, reply) => {
    const { clinicId, role: callerRole } = request.authUser

    // Only ADMIN or DOCTOR can invite; only ADMIN can invite other ADMINs
    if (callerRole !== 'ADMIN' && callerRole !== 'DOCTOR') {
      return Errors.FORBIDDEN(reply)
    }

    const body = request.body as {
      firstName: string
      lastName: string
      email: string
      role: 'DOCTOR' | 'STAFF' | 'ADMIN'
      specialty?: string
      licenseNumber?: string
    }

    // Only ADMIN can invite other ADMINs
    if (body.role === 'ADMIN' && callerRole !== 'ADMIN') {
      return Errors.FORBIDDEN(reply)
    }

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } })
    if (!clinic) return Errors.NOT_FOUND(reply, 'Clínica')

    const plan = clinic.planId ?? 'BASIC'
    const limits = getLimits(plan)

    // Count existing active users by role
    const allUsers = await prisma.doctor.findMany({ where: { clinicId } })
    const doctorCount = allUsers.filter(u => u.role === 'DOCTOR' || u.role === 'ADMIN').length
    const staffCount  = allUsers.filter(u => u.role === 'STAFF').length

    // Check plan limits
    if ((body.role === 'DOCTOR' || body.role === ('ADMIN' as Role)) && doctorCount >= limits.DOCTOR) {
      return reply.status(400).send({
        error: { message: `Límite de médicos alcanzado para el plan ${plan}` },
      })
    }

    if (body.role === 'STAFF' && staffCount >= limits.STAFF) {
      return reply.status(400).send({
        error: { message: `Límite de administrativos alcanzado para el plan ${plan}` },
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // STAFF users don't need a Doctor record — they have no schedule and must
    // not appear in doctor selectors. Create Doctor record only for DOCTOR/ADMIN.
    let doctor: Awaited<ReturnType<typeof prisma.doctor.create>> | null = null
    if (body.role !== 'STAFF') {
      doctor = await prisma.doctor.create({
        data: {
          clinicId,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          specialty: body.specialty ?? '',
          licenseNumber: body.licenseNumber ?? '',
          role: body.role as Role,
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
    }

    const redirectTo = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/auth/invite`

    // Generate invite link (does NOT send Supabase's default email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: body.email,
      options: {
        data: {
          clinic_id: clinicId,
          role: body.role,
          firstName: body.firstName,
          lastName: body.lastName,
          ...(doctor ? { doctor_id: doctor.id } : {}),
        },
        redirectTo,
      },
    })

    if (linkError) {
      if (doctor) await prisma.doctor.delete({ where: { id: doctor.id } }).catch(() => {})
      return reply.status(400).send({ error: { message: linkError.message } })
    }

    // Link authUserId to doctor record (only for DOCTOR/ADMIN)
    if (linkData?.user?.id && doctor) {
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { authUserId: linkData.user.id },
      }).catch(() => {})
    }

    // Send professional invite email via Resend
    const resendKey = process.env['RESEND_API_KEY']
    if (resendKey && linkData?.properties?.action_link) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'MedClinic PRO <medclinic@glasshaus.mx>',
          to: [body.email],
          subject: 'Bienvenido a MedClinic PRO — Activa tu cuenta',
          html: buildInviteEmail({
            firstName: body.firstName,
            email: body.email,
            role: body.role,
            actionLink: linkData.properties.action_link,
          }),
        }),
      }).catch(() => {})
    }

    return reply.status(201).send({ data: { doctor, inviteSent: true, inviteEmail: body.email } })
  })

  // ── PATCH /api/configuracion/users/:id ────────────────────────────────────
  // Update user: isActive toggle, specialty, licenseNumber
  fastify.patch('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId } = request.authUser
    const body = request.body as {
      isActive?: boolean
      firstName?: string
      lastName?: string
      specialty?: string
      licenseNumber?: string
    }

    // Ensure the user belongs to this clinic
    const existing = await prisma.doctor.findUnique({ where: { id } })
    if (!existing || existing.clinicId !== clinicId) {
      return Errors.NOT_FOUND(reply, 'Usuario')
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: {
        ...(body.isActive      !== undefined && { isActive:      body.isActive }),
        ...(body.firstName     !== undefined && { firstName:     body.firstName }),
        ...(body.lastName      !== undefined && { lastName:      body.lastName }),
        ...(body.specialty     !== undefined && { specialty:     body.specialty }),
        ...(body.licenseNumber !== undefined && { licenseNumber: body.licenseNumber }),
      },
    })

    return { data: doctor }
  })

  // ── POST /api/configuracion/users/:id/resend-invite ───────────────────────
  // Works for both pending users (no authUserId) and existing users.
  // authUserId is set at invite-generation time (not at acceptance), so we
  // cannot use its presence to determine if the user completed onboarding.
  // Strategy:
  //   - No authUserId → brand-new invite via inviteUserByEmail
  //   - authUserId present → recovery link via generateLink (password reset)
  //     so the user lands on /auth/invite and sets their password.
  fastify.post('/users/:id/resend-invite', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId } = request.authUser
    const redirectTo = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/auth/invite`
    const resendKey  = process.env['RESEND_API_KEY']

    const doctor = await prisma.doctor.findUnique({ where: { id } })
    if (!doctor || doctor.clinicId !== clinicId) {
      return Errors.NOT_FOUND(reply, 'Usuario')
    }

    const supabaseAdmin = getSupabaseAdmin()
    let actionLink: string

    if (!doctor.authUserId) {
      // User never existed in Supabase Auth — send a fresh invite
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: doctor.email,
        options: {
          data: { clinic_id: clinicId, role: doctor.role, firstName: doctor.firstName, lastName: doctor.lastName, doctor_id: doctor.id },
          redirectTo,
        },
      })
      if (error) return reply.status(400).send({ error: { message: error.message } })
      actionLink = data.properties.action_link
      // Save authUserId now that Supabase has created the user
      if (data.user?.id) {
        await prisma.doctor.update({ where: { id }, data: { authUserId: data.user.id } }).catch(() => {})
      }
    } else {
      // User already exists — send a recovery (set-password) link
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: doctor.email,
        options: { redirectTo },
      })
      if (error) return reply.status(400).send({ error: { message: error.message } })
      actionLink = data.properties.action_link
    }

    // Send via Resend
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'MedClinic PRO <medclinic@glasshaus.mx>',
          to: [doctor.email],
          subject: 'Acceso a MedClinic PRO',
          html: buildInviteEmail({
            firstName: doctor.firstName,
            email: doctor.email,
            role: doctor.role ?? 'DOCTOR',
            actionLink,
            isResend: true,
          }),
        }),
      }).catch(() => {})
    }

    return { data: { sent: true, email: doctor.email } }
  })

  // ── DELETE /api/configuracion/users/:id ───────────────────────────────────
  // Permanently removes a user from Supabase Auth and the Doctor table.
  // Only ADMIN can delete; cannot delete another ADMIN.
  fastify.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, role: callerRole } = request.authUser

    if (callerRole !== 'ADMIN') return Errors.FORBIDDEN(reply)

    const existing = await prisma.doctor.findUnique({ where: { id } })
    if (!existing || existing.clinicId !== clinicId) {
      return Errors.NOT_FOUND(reply, 'Usuario')
    }

    if (existing.role === 'ADMIN') {
      return reply.status(400).send({ error: { message: 'No puedes eliminar a otro administrador' } })
    }

    const supabaseAdmin = getSupabaseAdmin()

    if (existing.authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(existing.authUserId).catch(() => {})
    }

    await prisma.doctor.delete({ where: { id } })

    return { data: { deleted: true } }
  })
}
