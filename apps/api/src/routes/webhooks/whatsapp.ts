import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { sendWhatsAppMessage } from '../../services/whatsapp.js'

// Incoming WhatsApp Business API webhook
// Handles patient messages: appointment queries, check-in, payment status

export async function webhookWhatsapp(server: FastifyInstance) {
  // GET — webhook verification (Meta requires this)
  server.get('/', async (request, reply) => {
    const query = request.query as {
      'hub.mode'?: string
      'hub.verify_token'?: string
      'hub.challenge'?: string
    }

    if (
      query['hub.mode'] === 'subscribe' &&
      query['hub.verify_token'] === process.env['WHATSAPP_VERIFY_TOKEN']
    ) {
      return reply.send(query['hub.challenge'])
    }

    return reply.status(403).send('Forbidden')
  })

  // POST — receive incoming messages
  server.post('/', async (request, reply) => {
    const body = request.body as {
      object?: string
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              from: string
              type: string
              text?: { body: string }
              id: string
            }>
            metadata?: { phone_number_id: string }
          }
        }>
      }>
    }

    // Acknowledge immediately (Meta requires < 200ms response)
    reply.status(200).send('OK')

    if (body.object !== 'whatsapp_business_account') return

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value
        if (!value?.messages) continue

        const phoneNumberId = value.metadata?.phone_number_id

        // Find which clinic owns this phone number
        const clinic = await prisma.clinic.findFirst({
          where: { waPhoneNumberId: phoneNumberId },
        })
        if (!clinic) continue

        for (const message of value.messages) {
          const from = message.from // Patient's WhatsApp number
          const text = message.text?.body?.toLowerCase().trim() ?? ''

          // Find patient by phone
          const patient = await prisma.patient.findFirst({
            where: { clinicId: clinic.id, phone: `+${from}` },
          })

          if (!patient) {
            // Unknown number — invite to register
            await sendWhatsAppMessage(`+${from}`, {
              type: 'unknown_patient',
              clinicName: clinic.name,
            }).catch(console.error)
            continue
          }

          // Simple keyword routing
          if (text.includes('cita') || text.includes('agendar') || text.includes('hora')) {
            // Show next appointment
            const next = await prisma.appointment.findFirst({
              where: {
                patientId: patient.id,
                clinicId: clinic.id,
                startsAt: { gte: new Date() },
                status: { notIn: ['CANCELLED', 'NO_SHOW'] },
              },
              include: {
                doctor: { select: { firstName: true, lastName: true } },
                appointmentType: { select: { name: true } },
              },
              orderBy: { startsAt: 'asc' },
            })

            await sendWhatsAppMessage(`+${from}`, {
              type: 'next_appointment',
              patientName: patient.firstName,
              appointment: next ?? null,
            }).catch(console.error)

          } else if (text.includes('receta') || text.includes('medicamento')) {
            // Latest prescription
            const rx = await prisma.prescription.findFirst({
              where: { patientId: patient.id, clinicId: clinic.id },
              orderBy: { createdAt: 'desc' },
              select: { pdfUrl: true, createdAt: true },
            })

            await sendWhatsAppMessage(`+${from}`, {
              type: 'latest_prescription',
              patientName: patient.firstName,
              pdfUrl: rx?.pdfUrl ?? null,
              date: rx?.createdAt ?? null,
            }).catch(console.error)

          } else if (text.includes('resultado') || text.includes('laboratorio') || text.includes('estudio')) {
            // Latest lab result
            const lab = await prisma.labResult.findFirst({
              where: { patientId: patient.id, clinicId: clinic.id, status: 'RECEIVED' },
              orderBy: { createdAt: 'desc' },
              select: { title: true, fileUrl: true, externalUrl: true, createdAt: true },
            })

            await sendWhatsAppMessage(`+${from}`, {
              type: 'latest_lab_result',
              patientName: patient.firstName,
              lab: lab ?? null,
            }).catch(console.error)

          } else if (text.includes('pago') || text.includes('saldo') || text.includes('cobro')) {
            // Pending payment
            const invoice = await prisma.invoice.findFirst({
              where: {
                patientId: patient.id,
                clinicId: clinic.id,
                status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
              },
              orderBy: { issuedAt: 'desc' },
              select: {
                invoiceNumber: true,
                total: true,
                paidAmount: true,
                stripePaymentLinkUrl: true,
                currency: true,
              },
            })

            await sendWhatsAppMessage(`+${from}`, {
              type: 'payment_status',
              patientName: patient.firstName,
              invoice: invoice ?? null,
            }).catch(console.error)

          } else {
            // Generic help menu
            await sendWhatsAppMessage(`+${from}`, {
              type: 'help_menu',
              patientName: patient.firstName,
              clinicName: clinic.name,
            }).catch(console.error)
          }
        }
      }
    }
  })
}
