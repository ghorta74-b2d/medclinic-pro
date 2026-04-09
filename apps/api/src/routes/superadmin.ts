import type { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../lib/prisma.js'
import { Errors } from '../lib/errors.js'

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

async function sendInviteEmail(to: string, inviteUrl: string, firstName: string) {
  const resendKey = process.env['RESEND_API_KEY']
  if (!resendKey) throw new Error('RESEND_API_KEY not configured')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'MedClinic PRO <medclinic@glasshaus.mx>',
      to: [to],
      subject: 'Invitación a MedClinic PRO',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>Hola ${firstName},</h2>
          <p>Has sido invitado a MedClinic PRO. Haz clic en el botón para activar tu cuenta y establecer tu contraseña.</p>
          <a href="${inviteUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
            Activar cuenta
          </a>
          <p style="color:#888;font-size:12px">Si no esperabas esta invitación, ignora este mensaje.</p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Resend error ${res.status}: ${(body as any).message ?? res.statusText}`)
  }
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
        recentClinics,
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

    return { data: clinics }
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

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Create clinic
    const clinic = await prisma.clinic.create({
      data: {
        name: body.clinic.name,
        rfc: body.clinic.rfc ?? null,
        phone: body.clinic.phone,
        email: body.clinic.email,
        address: body.clinic.address ?? null,
        planId: body.clinic.plan ?? 'BASIC',
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
          mon: [{ start: '09:00', end: '18:00' }],
          tue: [{ start: '09:00', end: '18:00' }],
          wed: [{ start: '09:00', end: '18:00' }],
          thu: [{ start: '09:00', end: '18:00' }],
          fri: [{ start: '09:00', end: '18:00' }],
          sat: [{ start: '09:00', end: '14:00' }],
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
      // 5. Send via Resend directly
      await sendInviteEmail(body.admin.email, actionLink, body.admin.firstName)
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
    return { data: clinic }
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
          mon: [{ start: '09:00', end: '18:00' }],
          tue: [{ start: '09:00', end: '18:00' }],
          wed: [{ start: '09:00', end: '18:00' }],
          thu: [{ start: '09:00', end: '18:00' }],
          fri: [{ start: '09:00', end: '18:00' }],
          sat: [{ start: '09:00', end: '14:00' }],
        },
        consultationDuration: 30,
      },
    })

    // 2. Send invite
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

      await sendInviteEmail(doctor.email, actionLink, doctor.firstName)
      return { data: { sent: true, email: doctor.email } }
    } catch (err: any) {
      const msg = err?.message || String(err) || 'Error al enviar invitación'
      console.error('[resend-invite] error:', msg)
      return reply.status(400).send({ error: { message: msg } })
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
      await sendInviteEmail(email, actionLink, firstName || email)
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
