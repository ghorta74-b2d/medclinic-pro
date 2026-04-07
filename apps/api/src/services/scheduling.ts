import { prisma } from '../lib/prisma.js'
import { sendWhatsAppMessage } from './whatsapp.js'

// Schedule WhatsApp reminders for an appointment
// In production, use a cron job or Vercel Cron that checks for appointments
// needing reminders. This function marks which reminders should be sent.

export async function scheduleReminders(appointmentId: string): Promise<void> {
  // Reminders are sent by the cron job at /api/cron/reminders
  // This function is a no-op placeholder — the cron does the scheduling
  console.log(`[Reminders] Registered for appointment ${appointmentId}`)
}

// Called by Vercel Cron: /api/cron/reminders
// Schedule: every 15 minutes (0/15 * * * *)
export async function sendDueReminders(): Promise<void> {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in1h = new Date(now.getTime() + 60 * 60 * 1000)
  const window = 15 * 60 * 1000 // 15-minute window

  // 24-hour reminders
  const upcoming24h = await prisma.appointment.findMany({
    where: {
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      reminder24hSentAt: null,
      startsAt: {
        gte: new Date(in24h.getTime() - window),
        lte: new Date(in24h.getTime() + window),
      },
    },
    include: {
      patient: { select: { phone: true } },
      doctor: { select: { firstName: true, lastName: true } },
      appointmentType: { select: { name: true } },
    },
  })

  for (const appt of upcoming24h) {
    await sendWhatsAppMessage(appt.patient.phone, {
      type: 'appointment_reminder',
      appointment: appt,
      hoursAhead: 24,
    }).catch(console.error)

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { reminder24hSentAt: now },
    })
  }

  // 1-hour reminders
  const upcoming1h = await prisma.appointment.findMany({
    where: {
      status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'] },
      reminder1hSentAt: null,
      startsAt: {
        gte: new Date(in1h.getTime() - window),
        lte: new Date(in1h.getTime() + window),
      },
    },
    include: {
      patient: { select: { phone: true } },
      doctor: { select: { firstName: true, lastName: true } },
      appointmentType: { select: { name: true } },
    },
  })

  for (const appt of upcoming1h) {
    await sendWhatsAppMessage(appt.patient.phone, {
      type: 'appointment_reminder',
      appointment: appt,
      hoursAhead: 1,
    }).catch(console.error)

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { reminder1hSentAt: now },
    })
  }

  console.log(`[Reminders] Sent: ${upcoming24h.length} (24h) + ${upcoming1h.length} (1h)`)
}
