import type { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../lib/prisma.js'
import { Errors } from '../lib/errors.js'
import { buildInviteEmail, buildPasswordResetEmail, sendResendEmail } from '../lib/email.js'

// Call GoTrue admin generate_link directly (bypass JS SDK quirks)
async function generateInviteLink(email: string, metadata: Record<string, unknown>, redirectTo: string) {
  const supabaseUrl = process.env['SUPABASE_URL']!
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'invite', email, data: metadata, redirect_to: redirectTo }),
  })

  const body = await res.json() as any
  if (!res.ok) {
    throw new Error(body?.msg || body?.message || body?.error_description || `GoTrue ${res.status}`)
  }

  // action_link is in body.action_link or body.properties.action_link
  const actionLink: string = body.action_link ?? body.properties?.action_link
  const userId: string = body.id ?? body.user?.id ?? body.data?.user?.id

  if (!actionLink) throw new Error('GoTrue did not return action_link')
  return { actionLink, userId }
}

// Admin Supabase client (bypasses RLS, can create users)
function getSupabaseAdmin() {
  return createClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Guard: only SUPER_ADMIN can access these routes ──────────────
async function requireSuperAdmin(request: any, reply: any) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return Errors.UNAUTHORIZED(reply)

  const token = authHeader.slice(7)
  const supabaseAdmin = getSupabaseAdmin()
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) return Errors.UNAUTHORIZED(reply)

  const role = user.user_metadata?.role
  if (role !== 'SUPER_ADMIN') return reply.status(403).send({ error: { message: 'Acceso denegado — solo SUPER_ADMIN' } })

  request.authUser = { authUserId: user.id, clinicId: 'SUPERADMIN', role: 'SUPER_ADMIN' }
}

export const superadminRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply SUPER_ADMIN guard to all routes in this plugin
  fastify.addHook('preHandler', requireSuperAdmin)

  // ── GET /api/superadmin/stats ─────────────────────────────────
  fastify.get('/stats', async () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [clinicCount, doctorCount, patientCount, appointmentMonthCount, recentClinics] =
      await Promise.all([
        prisma.clinic.count({ where: { isActive: true } }),
        prisma.doctor.count({ where: { isActive: true } }),
        prisma.patient.count({ where: { isActive: true } }),
        prisma.appointment.count({ where: { startsAt: { gte: monthStart } } }),
        prisma.clinic.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { doctors: true, patients: true } } },
        }),
      ])

    return {
      data: {
        clinicCount,
        doctorCount,
        patientCount,
        appointmentMonthCount,
        recentClinics: recentClinics.map(c => ({ ...c, plan: c.planId ?? null })),
      },
    }
  })

  // ── GET /api/superadmin/clinics ───────────────────────────────
  fastify.get('/clinics', async (request) => {
    const { q } = request.query as { q?: string }

    const clinics = await prisma.clinic.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }
        : undefined,
      include: {
        _count: { select: { doctors: true, patients: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { data: clinics.map(c => ({ ...c, plan: c.planId ?? null })) }
  })

  // ── POST /api/superadmin/clinics ──────────────────────────────
  fastify.post('/clinics', async (request, reply) => {
    try {
    const body = request.body as {
      clinic: {
        name: string
        rfc?: string
        phone: string
        email: string
        address?: string
        plan?: string
      }
      admin: {
        firstName: string
        lastName: string
        email: string
        specialty: string
        licenseNumber: string
      }
    }

    // Validar duplicados antes de crear
    const [existingClinic, existingDoctor] = await Promise.all([
      prisma.clinic.findFirst({
        where: { OR: [{ name: { equals: body.clinic.name, mode: 'insensitive' } }, { email: body.clinic.email }] },
        select: { id: true, name: true },
      }),
      prisma.doctor.findFirst({
        where: { email: body.admin.email },
        select: { id: true, email: true },
      }),
    ])
    if (existingClinic) return reply.status(409).send({ error: { message: `Ya existe una clínica con ese nombre o email: "${existingClinic.name}"` } })
    if (existingDoctor) return reply.status(409).send({ error: { message: `Ya existe un usuario registrado con el email: ${body.admin.email}` } })

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Create clinic
    const clinic = await prisma.clinic.create({
      data: {
        name: body.clinic.name,
        rfc: body.clinic.rfc ?? null,
        phone: body.clinic.phone,
        email: body.clinic.email,
        address: body.clinic.address ?? null,
        planId: body.clinic.plan ?? 'esencial',
        isActive: true,
      },
    })

    // 2. Create doctor record
    const doctor = await prisma.doctor.create({
      data: {
        clinicId: clinic.id,
        firstName: body.admin.firstName,
        lastName: body.admin.lastName,
        email: body.admin.email,
        specialty: body.admin.specialty,
        licenseNumber: body.admin.licenseNumber,
        isActive: true,
        scheduleConfig: {
          mon: [{ start: '09:00', end: '19:00' }],
          tue: [{ start: '09:00', end: '19:00' }],
          wed: [{ start: '09:00', end: '19:00' }],
          thu: [{ start: '09:00', end: '19:00' }],
          fri: [{ start: '09:00', end: '19:00' }],
          sat: [{ start: '09:00', end: '15:00' }],
        },
        consultationDuration: 30,
      },
    })

    // 3. Create Supabase user + generate invite link (direct REST, bypasses JS SDK)
    const redirectTo = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/auth/invite`
    let inviteSent = false
    let inviteEmailError: string | null = null
    try {
      const { actionLink, userId } = await generateInviteLink(
        body.admin.email,
        { clinic_id: clinic.id, role: 'ADMIN', firstName: body.admin.firstName, lastName: body.admin.lastName, doctor_id: doctor.id },
        redirectTo,
      )
      // 4. Link auth user id to doctor
      if (userId) {
        await prisma.doctor.update({ where: { id: doctor.id }, data: { authUserId: userId } }).catch(() => {})
      }
      // 5. Send via Resend
      await sendResendEmail({
        to: body.admin.email,
        subject: 'Activa tu cuenta de Mediaclinic',
        html: buildInviteEmail({ firstName: body.admin.firstName, email: body.admin.email, role: 'ADMIN', actionLink }),
      })
      inviteSent = true
    } catch (inviteErr: any) {
      inviteEmailError = inviteErr.message
      console.error('[POST /clinics] invite error:', inviteErr.message)
    }

    return reply.status(201).send({
      data: {
        clinic,
        doctor,
        inviteSent,
        inviteEmail: body.admin.email,
        inviteError: inviteEmailError,
      },
    })
    } catch (err: any) {
      console.error('[POST /clinics] Error:', err?.message)
      console.error('[POST /clinics] Code:', err?.code)
      console.error('[POST /clinics] Meta:', JSON.stringify(err?.meta))
      return reply.status(500).send({ error: { message: err?.message ?? String(err), code: err?.code, meta: err?.meta } })
    }
  })

  // ── GET /api/superadmin/clinics/:id ───────────────────────────
  fastify.get('/clinics/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      include: {
        doctors: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { patients: true, appointments: true, invoices: true },
        },
      },
    })

    if (!clinic) return reply.status(404).send({ error: { message: 'Clínica no encontrada' } })

    // Enrich doctors with emailConfirmed — per-doctor try/catch so one bad authUserId doesn't crash the response
    let enrichedDoctors = clinic.doctors.map(doc => ({ ...doc, emailConfirmed: false }))
    try {
      const supabaseAdmin = getSupabaseAdmin()
      enrichedDoctors = await Promise.all(
        clinic.doctors.map(async (doc) => {
          if (!doc.authUserId) return { ...doc, emailConfirmed: false, lastSignInAt: null }
          try {
            const { data } = await supabaseAdmin.auth.admin.getUserById(doc.authUserId)
            return {
              ...doc,
              emailConfirmed: !!data?.user?.email_confirmed_at,
              lastSignInAt: data?.user?.last_sign_in_at ?? null,
            }
          } catch {
            return { ...doc, emailConfirmed: false, lastSignInAt: null }
          }
        })
      )
    } catch (err) {
      fastify.log.warn('[GET /clinics/:id] Supabase enrichment failed, returning doctors without emailConfirmed: %s', err)
    }

    return { data: { ...clinic, plan: clinic.planId ?? null, doctors: enrichedDoctors } }
  })

  // ── PATCH /api/superadmin/clinics/:id ─────────────────────────
  fastify.patch('/clinics/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      name?: string
      phone?: string
      email?: string
      address?: string
      rfc?: string
      plan?: string
      isActive?: boolean
    }

    const clinic = await prisma.clinic.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.rfc !== undefined && { rfc: body.rfc }),
        ...(body.plan !== undefined && { planId: body.plan }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    })

    return { data: clinic }
  })

  // ── POST /api/superadmin/clinics/:id/doctors ──────────────────
  fastify.post('/clinics/:id/doctors', async (request, reply) => {
    const { id: clinicId } = request.params as { id: string }
    const body = request.body as {
      firstName: string
      lastName: string
      email: string
      specialty: string
      licenseNumber: string
      role?: string
    }

    // Validar duplicado por email
    const existingDoctor = await prisma.doctor.findFirst({ where: { email: body.email }, select: { id: true } })
    if (existingDoctor) return reply.status(409).send({ error: { message: `Ya existe un usuario registrado con el email: ${body.email}` } })

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Create doctor record
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
          mon: [{ start: '09:00', end: '19:00' }],
          tue: [{ start: '09:00', end: '19:00' }],
          wed: [{ start: '09:00', end: '19:00' }],
          thu: [{ start: '09:00', end: '19:00' }],
          fri: [{ start: '09:00', end: '19:00' }],
          sat: [{ start: '09:00', end: '15:00' }],
        },
        consultationDuration: 30,
      },
    })

    // 2. Send invite via generateInviteLink + Resend (never Supabase default template)
    const redirectTo = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/auth/invite`
    const metadata = {
      clinic_id: clinicId,
      role: body.role ?? 'DOCTOR',
      firstName: body.firstName,
      lastName: body.lastName,
      doctor_id: doctor.id,
    }

    try {
      const { actionLink, userId } = await generateInviteLink(body.email, metadata, redirectTo)

      if (userId) {
        await prisma.doctor.update({
          where: { id: doctor.id },
          data: { authUserId: userId },
        }).catch(() => {})
      }

      await sendResendEmail({
        to: body.email,
        subject: 'Tu acceso a Mediaclinic',
        html: buildInviteEmail({ firstName: body.firstName, email: body.email, role: body.role ?? 'DOCTOR', actionLink, isResend: false }),
      })
    } catch (err: any) {
      await prisma.doctor.delete({ where: { id: doctor.id } }).catch(() => {})
      return reply.status(400).send({ error: { message: err?.message || 'Error al enviar invitación' } })
    }

    return reply.status(201).send({ data: { doctor, inviteSent: true } })
  })

  // ── POST /api/superadmin/clinics/:id/doctors/:doctorId/resend-invite ──
  fastify.post('/clinics/:id/doctors/:doctorId/resend-invite', async (request, reply) => {
    const { id: clinicId, doctorId } = request.params as { id: string; doctorId: string }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor) return reply.status(404).send({ error: { message: 'Doctor no encontrado' } })

    const supabaseAdmin = getSupabaseAdmin()
    const redirectTo = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/auth/invite`
    const metadata = {
      clinic_id: clinicId,
      role: 'DOCTOR',
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      doctor_id: doctor.id,
    }

    // Step 1: delete existing unconfirmed Supabase user if any
    if (doctor.authUserId) {
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(doctor.authUserId)
      if (existingUser?.user && !existingUser.user.email_confirmed_at) {
        await supabaseAdmin.auth.admin.deleteUser(doctor.authUserId).catch(() => {})
        await prisma.doctor.update({ where: { id: doctor.id }, data: { authUserId: null } }).catch(() => {})
      }
    }

    // Step 2: generate invite link + send email
    try {
      const { actionLink, userId } = await generateInviteLink(doctor.email, metadata, redirectTo)

      if (userId) {
        await prisma.doctor.update({
          where: { id: doctor.id },
          data: { authUserId: userId },
        }).catch(() => {})
      }

      await sendResendEmail({
        to: doctor.email,
        subject: 'Tu acceso a Mediaclinic',
        html: buildInviteEmail({ firstName: doctor.firstName, email: doctor.email, role: 'DOCTOR', actionLink, isResend: true }),
      })
      return { data: { sent: true, email: doctor.email } }
    } catch (err: any) {
      const msg = err?.message || String(err) || 'Error al enviar invitación'
      console.error('[resend-invite] error:', msg)
      return reply.status(400).send({ error: { message: msg } })
    }
  })

  // ── POST /api/superadmin/clinics/:id/doctors/:doctorId/reset-password ──
  fastify.post('/clinics/:id/doctors/:doctorId/reset-password', async (request, reply) => {
    const { doctorId } = request.params as { id: string; doctorId: string }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor?.authUserId) return reply.status(400).send({ error: { message: 'El usuario no tiene cuenta activa' } })

    const supabaseAdmin = getSupabaseAdmin()
    const redirectTo = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/auth/reset-password`

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: doctor.email,
      options: { redirectTo },
    })

    if (error) return reply.status(400).send({ error: { message: error.message } })

    const actionLink: string = (data as any).properties?.action_link ?? (data as any).action_link
    if (!actionLink) return reply.status(500).send({ error: { message: 'No se pudo generar el enlace de recuperación' } })

    try {
      await sendResendEmail({
        to: doctor.email,
        subject: 'Restablece tu contraseña — Mediaclinic',
        html: buildPasswordResetEmail({ firstName: doctor.firstName, resetLink: actionLink }),
      })
      return { data: { sent: true, email: doctor.email } }
    } catch (err: any) {
      return reply.status(400).send({ error: { message: err?.message || 'Error al enviar email' } })
    }
  })

  // ── GET /api/superadmin/admins ────────────────────────────────
  fastify.get('/admins', async (_request, reply) => {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (error) return reply.status(500).send({ error: { message: error.message } })
    const admins = (data.users ?? [])
      .filter((u: any) => u.user_metadata?.role === 'SUPER_ADMIN')
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.user_metadata?.firstName ?? '',
        lastName: u.user_metadata?.lastName ?? '',
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        isBanned: !!(u.banned_until),
        emailConfirmed: !!(u.email_confirmed_at),
      }))
    return { data: admins }
  })

  // ── POST /api/superadmin/admins ───────────────────────────────
  fastify.post('/admins', async (request, reply) => {
    const { email, firstName, lastName } = request.body as { email: string; firstName: string; lastName: string }
    const redirectTo = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/auth/invite`
    try {
      const { actionLink } = await generateInviteLink(email, { role: 'SUPER_ADMIN', firstName, lastName }, redirectTo)
      await sendResendEmail({
        to: email,
        subject: 'Acceso de administrador — Mediaclinic',
        html: buildInviteEmail({ firstName: firstName || email, email, role: 'ADMIN', actionLink }),
      })
      return { data: { sent: true } }
    } catch (err: any) {
      return reply.status(400).send({ error: { message: err?.message || 'Error al invitar' } })
    }
  })

  // ── PATCH /api/superadmin/admins/:userId ──────────────────────
  fastify.patch('/admins/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    const { isBanned } = request.body as { isBanned: boolean }
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: isBanned ? '876600h' : 'none',
    } as any)
    if (error) return reply.status(400).send({ error: { message: error.message } })
    return { data: { updated: true } }
  })

  // ── GET /api/superadmin/all-users ─────────────────────────────
  fastify.get('/all-users', async (request) => {
    const { q, clinicId } = request.query as { q?: string; clinicId?: string }
    const where: any = {}
    if (clinicId) where.clinicId = clinicId
    if (q) where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
    const users = await prisma.doctor.findMany({
      where,
      include: { clinic: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return { data: users }
  })

  // ── PATCH /api/superadmin/doctors/:doctorId ───────────────────
  fastify.patch('/doctors/:doctorId', async (request, reply) => {
    const { doctorId } = request.params as { doctorId: string }
    const body = request.body as { isActive?: boolean; specialty?: string; licenseNumber?: string }

    const doctor = await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.specialty !== undefined && { specialty: body.specialty }),
        ...(body.licenseNumber !== undefined && { licenseNumber: body.licenseNumber }),
      },
    })

    return { data: doctor }
  })
}
