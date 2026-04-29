import type { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../lib/prisma.js'
import { Errors } from '../lib/errors.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { buildInviteEmail, sendResendEmail } from '../lib/email.js'
import type { Role } from '../../generated/index.js'

// ── Supabase admin client (bypasses RLS, can invite users) ───────────────────
function getSupabaseAdmin() {
  return createClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
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
  fastify.patch('/clinic', { preHandler: requireAdmin }, async (request, reply) => {
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
      where: { clinicId, isActive: true },
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

    if (linkData?.properties?.action_link) {
      await sendResendEmail({
        to: body.email,
        subject: 'Bienvenido a MedClinic PRO — Activa tu cuenta',
        html: buildInviteEmail({
          firstName: body.firstName,
          email: body.email,
          role: body.role,
          actionLink: linkData.properties.action_link,
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

  // ── PATCH /api/configuracion/users/:id/role ───────────────────────────────
  // Promote DOCTOR → ADMIN or demote ADMIN → DOCTOR. Only clinic ADMIN can do this.
  fastify.patch('/users/:id/role', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, role: callerRole } = request.authUser
    if (callerRole !== 'ADMIN') return Errors.FORBIDDEN(reply)

    const body = request.body as { role: 'DOCTOR' | 'ADMIN' }
    if (!['DOCTOR', 'ADMIN'].includes(body.role)) {
      return Errors.VALIDATION(reply, { role: 'Must be DOCTOR or ADMIN' })
    }

    const existing = await prisma.doctor.findUnique({ where: { id } })
    if (!existing || existing.clinicId !== clinicId) {
      return Errors.NOT_FOUND(reply, 'Usuario')
    }
    // Can't change STAFF role from this endpoint
    if (existing.role === 'STAFF') {
      return Errors.VALIDATION(reply, { role: 'Use the invite system to change STAFF roles' })
    }

    // Update Doctor record role
    const updated = await prisma.doctor.update({
      where: { id },
      data: { role: body.role as any },
    })

    // Sync Supabase user_metadata so the JWT reflects the new role
    if (existing.authUserId) {
      const supabaseAdmin = getSupabaseAdmin()
      await supabaseAdmin.auth.admin.updateUserById(existing.authUserId, {
        user_metadata: { role: body.role, doctor_id: existing.id, clinic_id: clinicId },
      }).catch(console.error)
    }

    return { data: updated }
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

    await sendResendEmail({
      to: doctor.email,
      subject: 'Acceso a MedClinic PRO',
      html: buildInviteEmail({
        firstName: doctor.firstName,
        email: doctor.email,
        role: doctor.role ?? 'DOCTOR',
        actionLink,
        isResend: true,
      }),
    }).catch(() => {})

    return { data: { sent: true, email: doctor.email } }
  })

  // ── DELETE /api/configuracion/users/:id ───────────────────────────────────
  // Removes a user from Supabase Auth and the Doctor table.
  // If the doctor has historical data (appointments, prescriptions, notes)
  // we do a soft-delete (isActive=false) to preserve referential integrity
  // and NOM-004 retention. Only ADMIN can delete; cannot delete another ADMIN.
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

    // Always revoke access in Supabase Auth first
    if (existing.authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(existing.authUserId).catch(() => {})
    }

    // Check if this doctor has historical records that must be preserved (NOM-004)
    const [apptCount, noteCount, rxCount] = await Promise.all([
      prisma.appointment.count({ where: { doctorId: id } }),
      prisma.clinicalNote.count({ where: { doctorId: id } }),
      prisma.prescription.count({ where: { doctorId: id } }),
    ])
    const hasHistory = apptCount > 0 || noteCount > 0 || rxCount > 0

    if (hasHistory) {
      // Soft-delete: preserve records for audit/NOM-004, access already revoked above
      await prisma.doctor.update({ where: { id }, data: { isActive: false, authUserId: null } })
      return { data: { deleted: true, soft: true } }
    }

    // No history → safe to hard-delete
    await prisma.doctor.delete({ where: { id } })
    return { data: { deleted: true, soft: false } }
  })
}
