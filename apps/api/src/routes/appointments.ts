import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireStaff } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { scheduleReminders } from '../services/scheduling.js'
import { sendWhatsAppMessage } from '../services/whatsapp.js'

// ── Default schedule (Mon-Fri 9-18, Sat 9-14) ───────────────
export const DEFAULT_SCHEDULE: Record<string, { start: string; end: string }[]> = {
  mon: [{ start: '09:00', end: '18:00' }],
  tue: [{ start: '09:00', end: '18:00' }],
  wed: [{ start: '09:00', end: '18:00' }],
  thu: [{ start: '09:00', end: '18:00' }],
  fri: [{ start: '09:00', end: '18:00' }],
  sat: [{ start: '09:00', end: '14:00' }],
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

    // Send WhatsApp confirmation
    if (patient.phone) {
      await sendWhatsAppMessage(patient.phone, {
        type: 'appointment_confirmation',
        appointment,
      }).catch(console.error)
    }

    // Schedule reminders
    await scheduleReminders(appointment.id).catch(console.error)

    return reply.status(201).send({ data: appointment })
  })

  // PATCH /api/appointments/:id
  server.patch('/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId } = request.authUser
    const parsed = UpdateAppointmentSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const existing = await prisma.appointment.findFirst({ where: { id, clinicId } })
    if (!existing) return Errors.NOT_FOUND(reply, 'Appointment')

    const data = parsed.data
    const isCancelling = data.status === 'CANCELLED' && existing.status !== 'CANCELLED'

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

    // Notify patient of cancellation
    if (isCancelling && updated.patient.phone) {
      await sendWhatsAppMessage(updated.patient.phone, {
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
