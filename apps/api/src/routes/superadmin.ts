import type { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../lib/prisma.js'
import { Errors } from '../lib/errors.js'

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
        _count: { select: { doctors: true, patients: true, appointments: true } },
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
          monday: { start: '09:00', end: '18:00', enabled: true },
          tuesday: { start: '09:00', end: '18:00', enabled: true },
          wednesday: { start: '09:00', end: '18:00', enabled: true },
          thursday: { start: '09:00', end: '18:00', enabled: true },
          friday: { start: '09:00', end: '18:00', enabled: true },
          saturday: { start: '09:00', end: '14:00', enabled: false },
          sunday: { start: '09:00', end: '14:00', enabled: false },
        },
      },
    })

    // 3. Create user in Supabase Auth + generate invite link
    const redirectTo = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/dashboard`
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: body.admin.email,
      options: {
        data: { clinic_id: clinic.id, role: 'ADMIN', firstName: body.admin.firstName, lastName: body.admin.lastName, doctor_id: doctor.id },
        redirectTo,
      },
    })

    // 4. Link auth user id to doctor
    if (linkData?.user?.id) {
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { authUserId: linkData.user.id },
      }).catch(() => {})
    }

    // 5. Send invite email via Resend directly
    let inviteSent = false
    let inviteEmailError: string | null = null
    if (linkData?.properties?.action_link) {
      try {
        await sendInviteEmail(body.admin.email, linkData.properties.action_link, body.admin.firstName)
        inviteSent = true
      } catch (emailErr: any) {
        inviteEmailError = emailErr.message
        console.error('[POST /clinics] Resend error:', emailErr.message)
      }
    } else if (linkError) {
      inviteEmailError = linkError.message
      console.error('[POST /clinics] generateLink error:', linkError.message)
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
          monday: { start: '09:00', end: '18:00', enabled: true },
          tuesday: { start: '09:00', end: '18:00', enabled: true },
          wednesday: { start: '09:00', end: '18:00', enabled: true },
          thursday: { start: '09:00', end: '18:00', enabled: true },
          friday: { start: '09:00', end: '18:00', enabled: true },
          saturday: { start: '09:00', end: '14:00', enabled: false },
          sunday: { start: '09:00', end: '14:00', enabled: false },
        },
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

  // ── POST /api/superadmin/clinics/:id/doctors/:doctorId/resend-invite ──
  fastify.post('/clinics/:id/doctors/:doctorId/resend-invite', async (request, reply) => {
    const { id: clinicId, doctorId } = request.params as { id: string; doctorId: string }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor) return reply.status(404).send({ error: { message: 'Doctor no encontrado' } })

    const supabaseAdmin = getSupabaseAdmin()
    const redirectTo = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/dashboard`
    const inviteData = {
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

    // Step 2: generate invite link (creates Supabase user, no SMTP)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: doctor.email,
      options: { data: inviteData, redirectTo },
    })

    if (linkError) {
      return reply.status(400).send({ error: { message: linkError.message || 'Error al generar invite link' } })
    }

    // Step 3: link authUserId
    if (linkData?.user?.id) {
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { authUserId: linkData.user.id },
      }).catch(() => {})
    }

    // Step 4: send email via Resend directly
    if (!linkData?.properties?.action_link) {
      return reply.status(500).send({ error: { message: 'No se pudo generar el link de invitación' } })
    }

    await sendInviteEmail(doctor.email, linkData.properties.action_link, doctor.firstName)

    return { data: { sent: true, email: doctor.email } }
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
