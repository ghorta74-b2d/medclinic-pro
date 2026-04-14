import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireStaff } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { scheduleReminders } from '../services/scheduling.js'
import { sendWhatsAppMessage } from '../services/whatsapp.js'
// ── Email helper for doctor notifications ───────────────────
async function sendDoctorNotificationEmail(opts: {
  to: string
  subject: string
  bodyHtml: string
}) {
  const resendKey = process.env['RESEND_API_KEY']
  if (!resendKey) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'MedClinic PRO <medclinic@glasshaus.mx>',
      to: [opts.to],
      subject: opts.subject,
      html: `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 40px">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff">MedClinic PRO</p>
        </td></tr>
        <tr><td style="padding:32px 40px;font-size:14px;color:#374151;line-height:1.7">
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 40px 24px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;font-size:12px;color:#9ca3af">MedClinic PRO · Plataforma de gestión clínica</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    }),
  }).catch(() => {})
}

// ── Default schedule (Mon-Fri 9-18, Sat 9-14) ───────────────
export const DEFAULT_SCHEDULE: Record<string, { start: string; end: string }[]> = {
  mon: [{ start: '09:00', end: '19:00' }],
  tue: [{ start: '09:00', end: '19:00' }],
  wed: [{ start: '09:00', end: '19:00' }],
  thu: [{ start: '09:00', end: '19:00' }],
  fri: [{ start: '09:00', end: '19:00' }],
  sat: [{ start: '09:00', end: '15:00' }],
}

// ── Schemas ─────────────────────────────────────────────────

const CreateAppointmentSchema = z.object({
  patientId: z.string(),
  doctorId: z.string().optional(), // auto-resolves to first active doctor if omitted
  appointmentTypeId: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  mode: z.enum(['IN_PERSON', 'TELEMEDICINE', 'HOME_VISIT']).default('IN_PERSON'),
  chiefComplaint: z.string().optional(),
  internalNotes: z.string().optional(),
})

const UpdateAppointmentSchema = CreateAppointmentSchema.partial().extend({
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  cancellationReason: z.string().optional(),
  takeover: z.boolean().optional(), // ADMIN takes over another doctor's appointment
})

const AvailabilityQuerySchema = z.object({
  doctorId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
})

// ── Routes ───────────────────────────────────────────────────

export async function appointmentsRoutes(server: FastifyInstance) {
  // GET /api/appointments — list by date range
  server.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.authUser
    const query = request.query as {
      from?: string
      to?: string
      doctorId?: string
      patientId?: string
      status?: string
    }

    const where: Record<string, unknown> = { clinicId }
    if (query.from || query.to) {
      where['startsAt'] = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      }
    }
    if (query.doctorId) where['doctorId'] = query.doctorId
    if (query.patientId) where['patientId'] = query.patientId
    if (query.status) where['status'] = query.status

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        appointmentType: true,
      },
      orderBy: { startsAt: 'asc' },
    })

    return reply.send({ data: appointments })
  })

  // GET /api/appointments/availability — free slots for a doctor on a date
  server.get('/availability', { preHandler: authenticate }, async (request, reply) => {
    const parsed = AvailabilityQuerySchema.safeParse(request.query)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const { clinicId } = request.authUser
    const { doctorId, date } = parsed.data

    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, clinicId },
      select: { scheduleConfig: true, consultationDuration: true },
    })
    if (!doctor) return Errors.NOT_FOUND(reply, 'Doctor')

    const dayStart = new Date(`${date}T00:00:00`)
    const dayEnd = new Date(`${date}T23:59:59`)

    const booked = await prisma.appointment.findMany({
      where: {
        doctorId,
        clinicId,
        startsAt: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { startsAt: true, endsAt: true },
    })

    // Generate slots from schedule config — fallback to default Mon-Fri 9-18 / Sat 9-14
    const config = (doctor.scheduleConfig as Record<string, { start: string; end: string }[]> | null) ?? DEFAULT_SCHEDULE
    const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayStart.getDay()]!
    const daySchedule = config[dayName] ?? []
    const duration = doctor.consultationDuration || 30 // default 30 min if not set

    const slots: { startsAt: string; endsAt: string; available: boolean }[] = []

    for (const window of daySchedule) {
      const [startH, startM] = window.start.split(':').map(Number)
      const [endH, endM] = window.end.split(':').map(Number)
      if (startH === undefined || startM === undefined || endH === undefined || endM === undefined) continue

      let current = new Date(dayStart)
      current.setHours(startH, startM, 0, 0)
      const windowEnd = new Date(dayStart)
      windowEnd.setHours(endH, endM, 0, 0)

      while (current < windowEnd) {
        const slotEnd = new Date(current.getTime() + duration * 60_000)
        if (slotEnd > windowEnd) break

        const isBooked = booked.some(
          (b) => current < b.endsAt && slotEnd > b.startsAt
        )

        slots.push({
          startsAt: current.toISOString(),
          endsAt: slotEnd.toISOString(),
          available: !isBooked,
        })

        current = new Date(slotEnd)
      }
    }

    return reply.send({ data: slots })
  })

  // GET /api/appointments/:id
  server.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId } = request.authUser

    const appointment = await prisma.appointment.findFirst({
      where: { id, clinicId },
      include: {
        patient: true,
        doctor: { select: { id: true, firstName: true, lastName: true, licenseNumber: true, specialty: true } },
        appointmentType: true,
        clinicalNote: { select: { id: true, status: true } },
        invoice: { select: { id: true, status: true, total: true } },
        telehealthSession: true,
      },
    })

    if (!appointment) return Errors.NOT_FOUND(reply, 'Appointment')
    return reply.send({ data: appointment })
  })

  // POST /api/appointments
  server.post('/', { preHandler: requireStaff }, async (request, reply) => {
    const parsed = CreateAppointmentSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const { clinicId } = request.authUser
    const data = parsed.data

    // Verify patient belongs to this clinic
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, clinicId } })
    if (!patient) return Errors.NOT_FOUND(reply, 'Patient')

    // Resolve doctor: use provided ID or fall back to first active doctor in clinic
    const doctor = data.doctorId
      ? await prisma.doctor.findFirst({ where: { id: data.doctorId, clinicId, isActive: true } })
      : await prisma.doctor.findFirst({ where: { clinicId, isActive: true }, orderBy: { createdAt: 'asc' } })
    if (!doctor) return Errors.NOT_FOUND(reply, 'Doctor')

    const resolvedDoctorId = doctor.id

    // Check for conflicts
    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId: resolvedDoctorId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          {
            startsAt: { lt: new Date(data.endsAt) },
            endsAt: { gt: new Date(data.startsAt) },
          },
        ],
      },
    })
    if (conflict) {
      return reply.status(409).send({ error: { message: 'Ese horario ya está ocupado. Elige otro.' } })
    }

    const appointment = await prisma.appointment.create({
      data: {
        clinicId,
        patientId: data.patientId,
        doctorId: resolvedDoctorId,
        appointmentTypeId: data.appointmentTypeId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        mode: data.mode,
        chiefComplaint: data.chiefComplaint,
        internalNotes: data.internalNotes,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        doctor: { select: { id: true, firstName: true, lastName: true } },
        appointmentType: true,
      },
    })

    // Fire-and-forget: don't block the response waiting for external services
    if (patient.phone) {
      sendWhatsAppMessage(patient.phone, {
        type: 'appointment_confirmation',
        appointment,
      }).catch(console.error)
    }
    scheduleReminders(appointment.id).catch(console.error)

    return reply.status(201).send({ data: appointment })
  })

  // PATCH /api/appointments/:id
  server.patch('/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role, doctorId: callerDoctorId } = request.authUser
    const parsed = UpdateAppointmentSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const existing = await prisma.appointment.findFirst({
      where: { id, clinicId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, email: true, authUserId: true } },
      },
    })
    if (!existing) return Errors.NOT_FOUND(reply, 'Appointment')

    const data = parsed.data
    const isCancelling = data.status === 'CANCELLED' && existing.status !== 'CANCELLED'

    // ── TAKEOVER: ADMIN doctor takes over another doctor's appointment ──────────
    const isTakeover = data.takeover === true
    if (isTakeover) {
      if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) return Errors.FORBIDDEN(reply)
      if (!callerDoctorId) return reply.status(400).send({ error: { message: 'No tienes un perfil de médico asociado' } })
      if (callerDoctorId === existing.doctorId) {
        return reply.status(400).send({ error: { message: 'Esta cita ya está asignada a ti' } })
      }

      const callerDoctor = await prisma.doctor.findUnique({
        where: { id: callerDoctorId },
        select: { firstName: true, lastName: true, email: true },
      })
      if (!callerDoctor) return Errors.NOT_FOUND(reply, 'Doctor')

      const originalDoctor = existing.doctor
      const patient = existing.patient
      const aptTime = new Date(existing.startsAt).toLocaleString('es-MX', {
        dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City',
      })

      // Update appointment: change doctor + set IN_PROGRESS
      const updated = await prisma.appointment.update({
        where: { id },
        data: { doctorId: callerDoctorId, status: 'IN_PROGRESS' },
        include: { patient: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      })

      // AuditLog (fire-and-forget)
      prisma.auditLog.create({
        data: {
          clinicId,
          userId: authUserId,
          userRole: role as any,
          action: 'UPDATE',
          resourceType: 'Appointment',
          resourceId: id,
          previousValue: { doctorId: originalDoctor.id, doctorName: `${originalDoctor.firstName} ${originalDoctor.lastName}`, status: 'CHECKED_IN' },
          newValue: { doctorId: callerDoctorId, doctorName: `${callerDoctor.firstName} ${callerDoctor.lastName}`, status: 'IN_PROGRESS' },
          metadata: { action: 'TAKEOVER', patientName: `${patient.firstName} ${patient.lastName}` },
        },
      }).catch(console.error)

      // Notification for original doctor
      if (originalDoctor.authUserId) {
        prisma.notification.create({
          data: {
            clinicId,
            userId: originalDoctor.authUserId,
            type: 'APPOINTMENT_TAKEOVER',
            title: 'Tu paciente fue atendido por otro médico',
            message: `Dr. ${callerDoctor.firstName} ${callerDoctor.lastName} atendió a ${patient.firstName} ${patient.lastName} el ${aptTime}`,
            resourceType: 'Appointment',
            resourceId: id,
            metadata: { takenByName: `${callerDoctor.firstName} ${callerDoctor.lastName}`, patientName: `${patient.firstName} ${patient.lastName}` },
          },
        }).catch(console.error)
      }

      // Email to original doctor (fire-and-forget)
      if (originalDoctor.email) {
        sendDoctorNotificationEmail({
          to: originalDoctor.email,
          subject: `Tu paciente ${patient.firstName} ${patient.lastName} fue atendido por otro médico`,
          bodyHtml: `<p>Hola Dr. ${originalDoctor.firstName},</p>
            <p>El/La <strong>Dr./Dra. ${callerDoctor.firstName} ${callerDoctor.lastName}</strong> atendió a tu paciente
            <strong>${patient.firstName} ${patient.lastName}</strong> el ${aptTime}.</p>
            <p>Si tienes dudas, por favor comunícate con el administrador de la clínica.</p>`,
        }).catch(console.error)
      }

      return reply.send({ data: updated })
    }

    // ── REASSIGNMENT: ADMIN changes the doctor on an appointment ─────────────
    const isReassignment = data.doctorId && data.doctorId !== existing.doctorId
    if (isReassignment) {
      if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) return Errors.FORBIDDEN(reply)

      const newDoctor = await prisma.doctor.findFirst({
        where: { id: data.doctorId!, clinicId },
        select: { id: true, firstName: true, lastName: true, email: true, authUserId: true },
      })
      if (!newDoctor) return Errors.NOT_FOUND(reply, 'Doctor')

      const originalDoctor = existing.doctor
      const patient = existing.patient
      const aptTime = new Date(data.startsAt ?? existing.startsAt).toLocaleString('es-MX', {
        dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City',
      })

      const callerName = callerDoctorId
        ? await prisma.doctor.findUnique({ where: { id: callerDoctorId }, select: { firstName: true, lastName: true } })
            .then(d => d ? `Dr. ${d.firstName} ${d.lastName}` : 'El administrador')
        : 'El administrador'

      // Update appointment
      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          doctorId: newDoctor.id,
          ...(data.startsAt ? { startsAt: new Date(data.startsAt) } : {}),
          ...(data.endsAt ? { endsAt: new Date(data.endsAt) } : {}),
        },
        include: { patient: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      })

      // AuditLog
      prisma.auditLog.create({
        data: {
          clinicId,
          userId: authUserId,
          userRole: role as any,
          action: 'UPDATE',
          resourceType: 'Appointment',
          resourceId: id,
          previousValue: { doctorId: originalDoctor.id, doctorName: `${originalDoctor.firstName} ${originalDoctor.lastName}` },
          newValue: { doctorId: newDoctor.id, doctorName: `${newDoctor.firstName} ${newDoctor.lastName}` },
          metadata: { action: 'REASSIGNMENT', patientName: `${patient.firstName} ${patient.lastName}`, reassignedBy: authUserId },
        },
      }).catch(console.error)

      // Notifications for both doctors
      if (originalDoctor.authUserId) {
        prisma.notification.create({
          data: {
            clinicId,
            userId: originalDoctor.authUserId,
            type: 'APPOINTMENT_REASSIGNED_FROM',
            title: 'Cita reasignada',
            message: `Tu cita con ${patient.firstName} ${patient.lastName} el ${aptTime} fue asignada a Dr. ${newDoctor.firstName} ${newDoctor.lastName}`,
            resourceType: 'Appointment',
            resourceId: id,
          },
        }).catch(console.error)
      }
      if (newDoctor.authUserId) {
        prisma.notification.create({
          data: {
            clinicId,
            userId: newDoctor.authUserId,
            type: 'APPOINTMENT_REASSIGNED_TO',
            title: 'Nueva cita asignada',
            message: `Se te asignó la cita de ${patient.firstName} ${patient.lastName} el ${aptTime}`,
            resourceType: 'Appointment',
            resourceId: id,
          },
        }).catch(console.error)
      }

      // Emails to both doctors
      if (originalDoctor.email) {
        sendDoctorNotificationEmail({
          to: originalDoctor.email,
          subject: `Cita reasignada: ${patient.firstName} ${patient.lastName}`,
          bodyHtml: `<p>Hola Dr. ${originalDoctor.firstName},</p>
            <p>Tu cita con <strong>${patient.firstName} ${patient.lastName}</strong> programada para el ${aptTime}
            fue reasignada al/a la <strong>Dr./Dra. ${newDoctor.firstName} ${newDoctor.lastName}</strong> por ${callerName}.</p>`,
        }).catch(console.error)
      }
      if (newDoctor.email) {
        sendDoctorNotificationEmail({
          to: newDoctor.email,
          subject: `Nueva cita asignada: ${patient.firstName} ${patient.lastName}`,
          bodyHtml: `<p>Hola Dr. ${newDoctor.firstName},</p>
            <p>Se te asignó una cita con <strong>${patient.firstName} ${patient.lastName}</strong> para el ${aptTime}.</p>
            <p>La cita fue reasignada desde Dr./Dra. ${originalDoctor.firstName} ${originalDoctor.lastName} por ${callerName}.</p>`,
        }).catch(console.error)
      }

      return reply.send({ data: updated })
    }

    // ── NORMAL UPDATE ──────────────────────────────────────────────────────────
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(data.startsAt ? { startsAt: new Date(data.startsAt) } : {}),
        ...(data.endsAt ? { endsAt: new Date(data.endsAt) } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.mode ? { mode: data.mode } : {}),
        ...(data.chiefComplaint !== undefined ? { chiefComplaint: data.chiefComplaint } : {}),
        ...(data.internalNotes !== undefined ? { internalNotes: data.internalNotes } : {}),
        ...(isCancelling ? {
          cancelledAt: new Date(),
          cancellationReason: data.cancellationReason,
          cancelledBy: authUserId,
        } : {}),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    })

    // Fire-and-forget: notify patient of cancellation
    if (isCancelling && updated.patient.phone) {
      sendWhatsAppMessage(updated.patient.phone, {
        type: 'appointment_cancelled',
        appointment: updated,
        reason: data.cancellationReason,
      }).catch(console.error)
    }

    return reply.send({ data: updated })
  })

  // POST /api/appointments/:id/checkin — patient digital check-in
  server.post('/:id/checkin', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId } = request.authUser

    const appointment = await prisma.appointment.findFirst({
      where: { id, clinicId },
    })
    if (!appointment) return Errors.NOT_FOUND(reply, 'Appointment')

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        checkinCompletedAt: new Date(),
      },
    })

    return reply.send({ data: updated })
  })

  // GET /api/appointments/types — appointment type catalog
  server.get('/types', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.authUser

    const types = await prisma.appointmentType.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: 'asc' },
    })

    return reply.send({ data: types })
  })
}
