import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireDoctor } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { Errors } from '../lib/errors.js'
// Lazy-loaded to avoid @react-pdf/renderer initializing at module load time
// (yoga layout engine crashes Vercel serverless on cold start)
const getPdfGenerator = () => import('../services/pdf.js').then(m => m.generatePrescriptionPdf)
import { sendWhatsAppMessage } from '../services/whatsapp.js'

const PrescriptionItemSchema = z.object({
  medicationId: z.string().optional(),
  medicationName: z.string().min(1),
  dose: z.string().min(1),
  route: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().min(1),
  quantity: z.string().optional(),
  instructions: z.string().optional(),
  sortOrder: z.number().int().default(0),
})

const CreatePrescriptionSchema = z.object({
  patientId: z.string(),
  clinicalNoteId: z.string().optional(),
  items: z.array(PrescriptionItemSchema).min(1),
  instructions: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
})

export async function prescriptionsRoutes(server: FastifyInstance) {
  // GET /api/prescriptions
  server.get('/', { preHandler: requireDoctor }, async (request, reply) => {
    const { clinicId } = request.authUser
    const query = request.query as { patientId?: string; status?: string }

    const where: Record<string, unknown> = { clinicId }
    if (query.patientId) where['patientId'] = query.patientId
    if (query.status) where['status'] = query.status

    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        doctor: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { medication: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send({ data: prescriptions })
  })

  // GET /api/prescriptions/:id
  server.get('/:id', { preHandler: requireDoctor }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const prescription = await prisma.prescription.findFirst({
      where: { id, clinicId },
      include: {
        patient: true,
        doctor: {
          select: {
            id: true, firstName: true, lastName: true,
            cedula: true, specialty: true, institution: true, signatureUrl: true,
          },
        },
        items: { include: { medication: true }, orderBy: { sortOrder: 'asc' } },
        clinicalNote: { select: { id: true } },
      },
    })

    if (!prescription) return Errors.NOT_FOUND(reply, 'Prescription')

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'READ',
      resourceType: 'Prescription',
      resourceId: id,
    })

    return reply.send({ data: prescription })
  })

  // POST /api/prescriptions
  server.post('/', { preHandler: requireDoctor }, async (request, reply) => {
    const parsed = CreatePrescriptionSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const { clinicId, authUserId, role, doctorId } = request.authUser
    if (!doctorId) return Errors.FORBIDDEN(reply)

    const data = parsed.data

    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, clinicId } })
    if (!patient) return Errors.NOT_FOUND(reply, 'Patient')

    const prescription = await prisma.prescription.create({
      data: {
        clinicId,
        patientId: data.patientId,
        doctorId,
        clinicalNoteId: data.clinicalNoteId,
        instructions: data.instructions,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
        items: {
          create: data.items.map((item) => ({
            medicationId: item.medicationId,
            medicationName: item.medicationName,
            dose: item.dose,
            route: item.route,
            frequency: item.frequency,
            duration: item.duration,
            quantity: item.quantity,
            instructions: item.instructions,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: {
        patient: true,
        doctor: {
          select: {
            id: true, firstName: true, lastName: true,
            cedula: true, specialty: true, institution: true, signatureUrl: true,
          },
        },
        items: { include: { medication: true }, orderBy: { sortOrder: 'asc' } },
      },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'CREATE',
      resourceType: 'Prescription',
      resourceId: prescription.id,
      newValue: { patientId: data.patientId, itemCount: data.items.length },
    })

    return reply.status(201).send({ data: prescription })
  })

  // POST /api/prescriptions/:id/generate-pdf
  server.post('/:id/generate-pdf', { preHandler: requireDoctor }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const prescription = await prisma.prescription.findFirst({
      where: { id, clinicId },
      include: {
        patient: true,
        doctor: {
          select: {
            id: true, firstName: true, lastName: true,
            cedula: true, specialty: true, institution: true, signatureUrl: true,
          },
        },
        items: { include: { medication: true }, orderBy: { sortOrder: 'asc' } },
      },
    })
    if (!prescription) return Errors.NOT_FOUND(reply, 'Prescription')

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } })

    const generatePrescriptionPdf = await getPdfGenerator()
    const pdfUrl = await generatePrescriptionPdf(prescription, clinic)

    const updated = await prisma.prescription.update({
      where: { id },
      data: { pdfUrl, pdfGeneratedAt: new Date() },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'CREATE',
      resourceType: 'Prescription',
      resourceId: id,
      metadata: { action: 'pdf_generated' },
    })

    return reply.send({ data: { pdfUrl: updated.pdfUrl } })
  })

  // POST /api/prescriptions/:id/send-whatsapp
  server.post('/:id/send-whatsapp', { preHandler: requireDoctor }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const prescription = await prisma.prescription.findFirst({
      where: { id, clinicId },
      include: { patient: { select: { phone: true, firstName: true } } },
    })
    if (!prescription) return Errors.NOT_FOUND(reply, 'Prescription')
    if (!prescription.pdfUrl) {
      return Errors.VALIDATION(reply, { message: 'Generate PDF first' })
    }

    await sendWhatsAppMessage(prescription.patient.phone, {
      type: 'prescription',
      pdfUrl: prescription.pdfUrl,
      patientName: prescription.patient.firstName,
    })

    await prisma.prescription.update({
      where: { id },
      data: { sentViaWhatsApp: true, sentAt: new Date() },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'SEND',
      resourceType: 'Prescription',
      resourceId: id,
      metadata: { channel: 'whatsapp' },
    })

    return reply.send({ success: true })
  })

  // GET /api/prescriptions/medications/search — medication catalog search
  server.get('/medications/search', { preHandler: requireDoctor }, async (request, reply) => {
    const query = request.query as { q?: string }
    if (!query.q || query.q.length < 2) {
      return reply.send({ data: [] })
    }

    const medications = await prisma.medication.findMany({
      where: {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { brandName: { contains: query.q, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { name: 'asc' },
    })

    return reply.send({ data: medications })
  })
}
