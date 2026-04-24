import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { sendWhatsAppMessage } from '../../services/whatsapp.js'

// Webhook endpoint for labs to push results directly
// Labs authenticate via X-Lab-API-Key header

const LabResultWebhookSchema = z.object({
  patientPhone: z.string(),           // Patient WhatsApp (E.164)
  clinicId: z.string(),
  title: z.string(),
  category: z.enum(['LABORATORY', 'IMAGING', 'PATHOLOGY', 'CARDIOLOGY', 'ENDOSCOPY', 'OTHER']).default('LABORATORY'),
  laboratoryName: z.string().optional(),
  fileUrl: z.string().url().optional(),
  reportedAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
})

export async function webhookLab(server: FastifyInstance) {
  server.post('/', async (request, reply) => {
    // Verify API key
    const apiKey = request.headers['x-lab-api-key']
    if (!apiKey || apiKey !== process.env['LAB_WEBHOOK_API_KEY']) {
      return reply.status(401).send('Unauthorized')
    }

    const parsed = LabResultWebhookSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({ error: parsed.error.format() })
    }

    const data = parsed.data

    // Find patient by phone
    const patient = await prisma.patient.findFirst({
      where: { clinicId: data.clinicId, phone: data.patientPhone },
      select: { id: true, firstName: true, phone: true },
    })

    if (!patient) {
      return reply.status(404).send({ error: 'Patient not found' })
    }

    const result = await prisma.labResult.create({
      data: {
        clinicId: data.clinicId,
        patientId: patient.id,
        title: data.title,
        category: data.category,
        laboratoryName: data.laboratoryName,
        fileUrl: data.fileUrl,
        reportedAt: data.reportedAt ? new Date(data.reportedAt) : new Date(),
        status: 'RECEIVED',
        sourceWebhook: true,
        webhookPayload: data.metadata,
      },
    })

    // Auto-notify patient via WhatsApp
    if (data.fileUrl) {
      await sendWhatsAppMessage(patient.phone, {
        type: 'lab_result_ready',
        patientName: patient.firstName,
        title: data.title,
        fileUrl: data.fileUrl,
      }).catch(console.error)

      await prisma.labResult.update({
        where: { id: result.id },
        data: { status: 'NOTIFIED', notifiedAt: new Date() },
      })
    }

    return reply.status(201).send({ success: true, resultId: result.id })
  })
}
