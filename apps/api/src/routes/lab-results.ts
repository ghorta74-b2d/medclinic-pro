import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireStaff } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { Errors } from '../lib/errors.js'
import { supabase, getSignedFileUrl, getSignedFileUrls } from '../lib/supabase.js'
import { sendWhatsAppMessage } from '../services/whatsapp.js'
import Anthropic from '@anthropic-ai/sdk'

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

    const where: Record<string, unknown> = { clinicId, deletedAt: null }
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

    // Batch-sign any file URLs
    const filePaths = results.map(r => r.fileUrl).filter((u): u is string => !!u)
    const signedMap = await getSignedFileUrls(filePaths)
    const data = results.map(r => ({
      ...r,
      fileUrl: r.fileUrl ? (signedMap.get(r.fileUrl) ?? r.fileUrl) : r.fileUrl,
    }))

    return reply.send({
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  })

  // GET /api/lab-results/:id
  server.get('/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const result = await prisma.labResult.findFirst({
      where: { id, clinicId, deletedAt: null },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        clinicalNote: { select: { id: true } },
      },
    })

    if (!result) return Errors.NOT_FOUND(reply, 'Lab result')

    // Generate signed URL for private bucket
    const fileUrl = result.fileUrl ? await getSignedFileUrl(result.fileUrl) : result.fileUrl

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'READ',
      resourceType: 'LabResult',
      resourceId: id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.send({ data: { ...result, fileUrl } })
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
      ip: request.ip,
      userAgent: request.headers['user-agent'],
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

    // Store the bucket-relative path (not the full public URL) — bucket is private
    const updated = await prisma.labResult.update({
      where: { id },
      data: {
        fileUrl: uploaded.path,
        status: 'RECEIVED',
        reportedAt: new Date(),
      },
    })

    // Return a signed URL so the client can access the file immediately
    const signedFileUrl = await getSignedFileUrl(uploaded.path)

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'UPDATE',
      resourceType: 'LabResult',
      resourceId: id,
      metadata: { action: 'file_uploaded', fileName },
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.send({ data: { ...updated, fileUrl: signedFileUrl } })
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
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.send({ success: true })
  })

  // POST /api/lab-results/:id/summarize — AI summary using Claude
  server.post('/:id/summarize', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const result = await prisma.labResult.findFirst({ where: { id, clinicId } })
    if (!result) return Errors.NOT_FOUND(reply, 'Lab result')
    if (!result.fileUrl) return Errors.VALIDATION(reply, { message: 'No hay archivo adjunto para analizar' })

    const apiKey = process.env['ANTHROPIC_API_KEY']
    if (!apiKey) return Errors.INTERNAL(reply, 'ANTHROPIC_API_KEY not configured')

    try {
      // Generate a fresh signed URL to download from the private bucket
      const downloadUrl = await getSignedFileUrl(result.fileUrl)
      const pdfResponse = await fetch(downloadUrl)
      if (!pdfResponse.ok) return Errors.INTERNAL(reply, 'Could not download PDF')
      const arrayBuffer = await pdfResponse.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      const anthropic = new Anthropic({ apiKey })
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 900,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            } as any,
            {
              type: 'text',
              text: `Eres un asistente médico experto. Analiza estos resultados de laboratorio y proporciona un resumen clínico estructurado en español.

FORMATO OBLIGATORIO — usa EXACTAMENTE esta estructura:

# Resumen Clínico de Resultados de Laboratorio

**Paciente:** [sexo, edad si disponible] | **Fecha:** [fecha del reporte]

---

## 1. Valores Fuera de Rango

| Parámetro | Resultado | Referencia | Desviación |
|-----------|-----------|------------|------------|
| [nombre] | [valor] | [rango normal] | [↑/↓ descripción] |

## 2. Hallazgos Relevantes

- **Hallazgo principal:** descripción clínica detallada
- (lista todos los hallazgos significativos)

## 3. Interpretación General

Párrafo con la interpretación clínica global, implicaciones y recomendaciones de seguimiento. Máximo 4 oraciones.

REGLAS: Usa exactamente los encabezados ##, tablas markdown con |, negritas **texto**, y listas -. Máximo 400 palabras. Lenguaje médico apropiado en español.`,
            },
          ],
        }],
      })

      const summary = message.content[0]?.type === 'text' ? message.content[0].text : ''

      const updated = await prisma.labResult.update({
        where: { id },
        data: {
          llmSummary: summary,
          llmSummaryGeneratedAt: new Date(),
          llmProvider: 'anthropic/claude-sonnet-4-6',
          status: 'REVIEWED',
          reviewedAt: new Date(),
        },
      })

      await auditLog({
        user: { authUserId, clinicId, role },
        action: 'UPDATE',
        resourceType: 'LabResult',
        resourceId: id,
        metadata: { action: 'ai_summarized', llmProvider: 'anthropic/claude-sonnet-4-6' },
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      })

      return reply.send({ data: updated })
    } catch (err) {
      return Errors.INTERNAL(reply, err instanceof Error ? err.message : 'AI analysis failed')
    }
  })

  // PATCH /api/lab-results/:id/notes — update doctor notes only
  server.patch('/:id/notes', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId } = request.authUser
    const body = request.body as { notes: string }

    const result = await prisma.labResult.findFirst({ where: { id, clinicId } })
    if (!result) return Errors.NOT_FOUND(reply, 'Lab result')

    const updated = await prisma.labResult.update({
      where: { id },
      data: { notes: body.notes },
    })
    return reply.send({ data: updated })
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
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.send({ data: updated })
  })

  // DELETE /api/lab-results/:id — NOM-004: soft delete only, file retained for 5-year retention
  server.delete('/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const result = await prisma.labResult.findFirst({ where: { id, clinicId, deletedAt: null } })
    if (!result) return Errors.NOT_FOUND(reply, 'Lab result')

    // Soft delete: mark as deleted but retain record and file for NOM-004 5-year retention
    await prisma.labResult.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'DELETE',
      resourceType: 'LabResult',
      resourceId: id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.send({ success: true })
  })
}
