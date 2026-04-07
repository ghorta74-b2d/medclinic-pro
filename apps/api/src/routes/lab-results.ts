import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireStaff } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { Errors } from '../lib/errors.js'
import { supabase } from '../lib/supabase.js'
import { sendWhatsAppMessage } from '../services/whatsapp.js'

const CreateLabResultSchema = z.object({
  patientId: z.string(),
  clinicalNoteId: z.string().optional(),
  title: z.string().min(1),
  category: z.enum(['LABORATORY', 'IMAGING', 'PATHOLOGY', 'CARDIOLOGY', 'ENDOSCOPY', 'OTHER']).default('LABORATORY'),
  laboratoryName: z.string().optional(),
  orderedAt: z.string().datetime().optional(),
  collectedAt: z.string().datetime().optional(),
  reportedAt: z.string().datetime().optional(),
  externalUrl: z.string().url().optional(),
  notes: z.string().optional(),
})

export async function labResultsRoutes(server: FastifyInstance) {
  // GET /api/lab-results
  server.get('/', { preHandler: requireStaff }, async (request, reply) => {
    const { clinicId } = request.authUser
    const query = request.query as {
      patientId?: string
      status?: string
      category?: string
      page?: string
      limit?: string
    }

    const page = parseInt(query.page ?? '1', 10)
    const limit = parseInt(query.limit ?? '20', 10)

    const where: Record<string, unknown> = { clinicId }
    if (query.patientId) where['patientId'] = query.patientId
    if (query.status) where['status'] = query.status
    if (query.category) where['category'] = query.category

    const [results, total] = await Promise.all([
      prisma.labResult.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.labResult.count({ where }),
    ])

    return reply.send({
      data: results,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  })

  // GET /api/lab-results/:id
  server.get('/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const result = await prisma.labResult.findFirst({
      where: { id, clinicId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        clinicalNote: { select: { id: true } },
      },
    })

    if (!result) return Errors.NOT_FOUND(reply, 'Lab result')

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'READ',
      resourceType: 'LabResult',
      resourceId: id,
    })

    return reply.send({ data: result })
  })

  // POST /api/lab-results (metadata only — file uploaded separately via /upload)
  server.post('/', { preHandler: requireStaff }, async (request, reply) => {
    const parsed = CreateLabResultSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const { clinicId, authUserId, role } = request.authUser
    const data = parsed.data

    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, clinicId } })
    if (!patient) return Errors.NOT_FOUND(reply, 'Patient')

    const result = await prisma.labResult.create({
      data: {
        clinicId,
        patientId: data.patientId,
        clinicalNoteId: data.clinicalNoteId,
        title: data.title,
        category: data.category,
        laboratoryName: data.laboratoryName,
        orderedAt: data.orderedAt ? new Date(data.orderedAt) : undefined,
        collectedAt: data.collectedAt ? new Date(data.collectedAt) : undefined,
        reportedAt: data.reportedAt ? new Date(data.reportedAt) : undefined,
        externalUrl: data.externalUrl,
        notes: data.notes,
        status: 'PENDING',
      },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'CREATE',
      resourceType: 'LabResult',
      resourceId: result.id,
      newValue: { patientId: data.patientId, title: data.title },
    })

    return reply.status(201).send({ data: result })
  })

  // POST /api/lab-results/:id/upload — file upload to Supabase Storage
  server.post('/:id/upload', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const result = await prisma.labResult.findFirst({ where: { id, clinicId } })
    if (!result) return Errors.NOT_FOUND(reply, 'Lab result')

    const data = await request.file()
    if (!data) return Errors.VALIDATION(reply, { message: 'No file provided' })

    const fileBuffer = await data.toBuffer()
    const fileName = `lab-results/${clinicId}/${id}/${Date.now()}-${data.filename}`

    const { data: uploaded, error } = await supabase.storage
      .from('clinical-files')
      .upload(fileName, fileBuffer, {
        contentType: data.mimetype,
        upsert: true,
      })

    if (error) return Errors.INTERNAL(reply, error)

    const { data: publicUrl } = supabase.storage
      .from('clinical-files')
      .getPublicUrl(uploaded.path)

    const updated = await prisma.labResult.update({
      where: { id },
      data: {
        fileUrl: publicUrl.publicUrl,
        status: 'RECEIVED',
        reportedAt: new Date(),
      },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'UPDATE',
      resourceType: 'LabResult',
      resourceId: id,
      metadata: { action: 'file_uploaded', fileName },
    })

    return reply.send({ data: updated })
  })

  // POST /api/lab-results/:id/notify — send WhatsApp notification to patient
  server.post('/:id/notify', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const result = await prisma.labResult.findFirst({
      where: { id, clinicId },
      include: { patient: { select: { phone: true, firstName: true } } },
    })
    if (!result) return Errors.NOT_FOUND(reply, 'Lab result')
    if (!result.fileUrl && !result.externalUrl) {
      return Errors.VALIDATION(reply, { message: 'No file to share — upload or add external URL first' })
    }

    await sendWhatsAppMessage(result.patient.phone, {
      type: 'lab_result_ready',
      patientName: result.patient.firstName,
      title: result.title,
      fileUrl: result.fileUrl ?? result.externalUrl ?? '',
    })

    await prisma.labResult.update({
      where: { id },
      data: { status: 'NOTIFIED', notifiedAt: new Date() },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'SEND',
      resourceType: 'LabResult',
      resourceId: id,
      metadata: { channel: 'whatsapp' },
    })

    return reply.send({ success: true })
  })

  // PATCH /api/lab-results/:id/review — doctor marks as reviewed with notes
  server.patch('/:id/review', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const body = request.body as { notes?: string }

    const result = await prisma.labResult.findFirst({ where: { id, clinicId } })
    if (!result) return Errors.NOT_FOUND(reply, 'Lab result')

    const updated = await prisma.labResult.update({
      where: { id },
      data: {
        status: 'REVIEWED',
        reviewedAt: new Date(),
        reviewedBy: authUserId,
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'UPDATE',
      resourceType: 'LabResult',
      resourceId: id,
      metadata: { action: 'reviewed' },
    })

    return reply.send({ data: updated })
  })
}
