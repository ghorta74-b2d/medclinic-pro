import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { Errors } from '../../lib/errors.js'

// ElevenLabs Conversational AI tool call webhook
// The voice agent calls these endpoints to perform actions during phone calls

export async function webhookElevenLabs(server: FastifyInstance) {
  // Verify ElevenLabs signature
  async function verifySignature(request: Parameters<typeof server.get>[1] extends { preHandler: infer P } ? never : Parameters<typeof server.addHook>[1]) {
    // In production: validate X-ElevenLabs-Signature header
    // For now, verify shared secret in Authorization header
    const auth = (request as unknown as { headers: Record<string, string> }).headers.authorization
    if (auth !== `Bearer ${process.env['ELEVENLABS_WEBHOOK_SECRET']}`) {
      return false
    }
    return true
  }

  // POST /api/webhooks/elevenlabs/get-availability
  // Called by voice agent to check available slots
  server.post('/get-availability', async (request, reply) => {
    const body = request.body as {
      clinicId?: string
      doctorId?: string
      date?: string
    }

    if (!body.clinicId || !body.date) {
      return Errors.VALIDATION(reply, { message: 'clinicId and date required' })
    }

    const doctor = await prisma.doctor.findFirst({
      where: { clinicId: body.clinicId, isActive: true },
      select: { id: true, scheduleConfig: true, consultationDuration: true },
    })

    if (!doctor) {
      return reply.send({ slots: [], message: 'No doctors available' })
    }

    const dayStart = new Date(`${body.date}T00:00:00`)
    const booked = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        startsAt: { gte: dayStart, lt: new Date(dayStart.getTime() + 86400000) },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { startsAt: true, endsAt: true },
    })

    const config = (doctor.scheduleConfig as Record<string, { start: string; end: string }[]> | null) ?? {}
    const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayStart.getDay()]!
    const daySchedule = config[dayName] ?? []

    const availableSlots: string[] = []
    for (const window of daySchedule) {
      const [startH, startM] = window.start.split(':').map(Number)
      const [endH, endM] = window.end.split(':').map(Number)
      if (startH === undefined || startM === undefined || endH === undefined || endM === undefined) continue

      let current = new Date(dayStart)
      current.setHours(startH, startM, 0, 0)
      const windowEnd = new Date(dayStart)
      windowEnd.setHours(endH, endM, 0, 0)

      while (current < windowEnd) {
        const slotEnd = new Date(current.getTime() + doctor.consultationDuration * 60_000)
        if (slotEnd > windowEnd) break

        const isBooked = booked.some((b) => current < b.endsAt && slotEnd > b.startsAt)
        if (!isBooked) {
          availableSlots.push(current.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
        }
        current = new Date(slotEnd)
      }
    }

    return reply.send({
      available: availableSlots.length > 0,
      slots: availableSlots.slice(0, 6), // Return first 6 for voice readability
      doctorId: doctor.id,
    })
  })

  // POST /api/webhooks/elevenlabs/book-appointment
  // Called by voice agent to create an appointment
  server.post('/book-appointment', async (request, reply) => {
    const body = request.body as {
      clinicId?: string
      doctorId?: string
      patientPhone?: string
      patientName?: string
      startsAt?: string
      chiefComplaint?: string
    }

    if (!body.clinicId || !body.patientPhone || !body.startsAt) {
      return Errors.VALIDATION(reply, { message: 'clinicId, patientPhone, and startsAt required' })
    }

    const clinic = await prisma.clinic.findUnique({ where: { id: body.clinicId } })
    if (!clinic) return reply.send({ success: false, message: 'Clinic not found' })

    // Find or create patient
    let patient = await prisma.patient.findFirst({
      where: { clinicId: body.clinicId, phone: body.patientPhone },
    })

    if (!patient && body.patientName) {
      const [firstName, ...lastParts] = body.patientName.split(' ')
      patient = await prisma.patient.create({
        data: {
          clinicId: body.clinicId,
          firstName: firstName ?? '',
          lastName: lastParts.join(' ') || 'N/A',
          phone: body.patientPhone,
        },
      })
    }

    if (!patient) {
      return reply.send({ success: false, message: 'Patient not found. Please provide patient name.' })
    }

    const doctorId = body.doctorId ?? (
      await prisma.doctor.findFirst({ where: { clinicId: body.clinicId, isActive: true } })
    )?.id

    if (!doctorId) {
      return reply.send({ success: false, message: 'No doctor available' })
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: typeof doctorId === 'string' ? doctorId : doctorId } })
    const duration = doctor?.consultationDuration ?? 30

    const startsAt = new Date(body.startsAt)
    const endsAt = new Date(startsAt.getTime() + duration * 60_000)

    // Check conflict
    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId: typeof doctorId === 'string' ? doctorId : doctorId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    })

    if (conflict) {
      return reply.send({ success: false, message: 'That time slot is no longer available' })
    }

    const appointment = await prisma.appointment.create({
      data: {
        clinicId: body.clinicId,
        patientId: patient.id,
        doctorId: typeof doctorId === 'string' ? doctorId : doctorId,
        startsAt,
        endsAt,
        chiefComplaint: body.chiefComplaint,
        status: 'CONFIRMED',
      },
    })

    const dateStr = startsAt.toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    const timeStr = startsAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

    return reply.send({
      success: true,
      appointmentId: appointment.id,
      confirmationMessage: `Su cita ha sido agendada para el ${dateStr} a las ${timeStr}.`,
    })
  })

  // POST /api/webhooks/elevenlabs/get-patient-info
  server.post('/get-patient-info', async (request, reply) => {
    const body = request.body as { clinicId?: string; phone?: string }

    if (!body.clinicId || !body.phone) {
      return reply.send({ found: false })
    }

    const patient = await prisma.patient.findFirst({
      where: { clinicId: body.clinicId, phone: body.phone },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!patient) return reply.send({ found: false })

    return reply.send({
      found: true,
      patientId: patient.id,
      name: `${patient.firstName} ${patient.lastName}`,
    })
  })
}
