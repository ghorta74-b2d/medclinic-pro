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

  // ── GET /api/configuracion/doctors ────────────────────────────────────────
  // Kept for backwards compatibility — returns only active doctors
  fastify.get('/doctors', async (request) => {
    const { clinicId } = request.authUser

    const doctors = await prisma.doctor.findMany({
      where: { clinicId, isActive: true },
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
        redirectTo: `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/dashboard`,
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

    // Only ADMIN or DOCTOR can invite
    if (callerRole !== 'ADMIN' && callerRole !== 'DOCTOR') {
      return Errors.FORBIDDEN(reply)
    }

    const body = request.body as {
      firstName: string
      lastName: string
      email: string
      role: 'DOCTOR' | 'STAFF'
      specialty?: string
      licenseNumber?: string
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

    // Create Doctor record (authUserId left null until invite succeeds)
    const doctor = await prisma.doctor.create({
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

    // Send invite via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      body.email,
      {
        data: {
          clinic_id: clinicId,
          role: body.role,
          firstName: body.firstName,
          lastName: body.lastName,
          doctor_id: doctor.id,
        },
        redirectTo: `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/dashboard`,
      }
    )

    if (inviteError) {
      await prisma.doctor.delete({ where: { id: doctor.id } }).catch(() => {})
      return reply.status(400).send({ error: { message: inviteError.message } })
    }

    // Link authUserId to doctor record after successful invite
    if (inviteData?.user?.id) {
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { authUserId: inviteData.user.id },
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
        ...(body.specialty     !== undefined && { specialty:     body.specialty }),
        ...(body.licenseNumber !== undefined && { licenseNumber: body.licenseNumber }),
      },
    })

    return { data: doctor }
  })

  // ── POST /api/configuracion/users/:id/resend-invite ───────────────────────
  // Resend invite email for pending users (those without authUserId)
  fastify.post('/users/:id/resend-invite', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId } = request.authUser

    const doctor = await prisma.doctor.findUnique({ where: { id } })
    if (!doctor || doctor.clinicId !== clinicId) {
      return Errors.NOT_FOUND(reply, 'Usuario')
    }

    if (doctor.authUserId) {
      return reply.status(400).send({
        error: { message: 'El usuario ya aceptó la invitación' },
      })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(doctor.email, {
      data: {
        clinic_id: clinicId,
        role: doctor.role,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        doctor_id: doctor.id,
      },
      redirectTo: `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/dashboard`,
    })

    if (error) return reply.status(400).send({ error: { message: error.message } })

    return { data: { sent: true, email: doctor.email } }
  })
}
