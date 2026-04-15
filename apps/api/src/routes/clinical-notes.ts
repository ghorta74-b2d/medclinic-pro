import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireDoctor, requireStaff } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { Errors } from '../lib/errors.js'

const DiagnosisSchema = z.object({
  code: z.string(),      // CIE-10 code e.g. "O80"
  description: z.string(),
  type: z.enum(['PRIMARY', 'SECONDARY', 'RULE_OUT']),
})

const VitalSignsSchema = z.object({
  weightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  systolicBp: z.number().int().min(60).max(250).optional(),
  diastolicBp: z.number().int().min(40).max(150).optional(),
  heartRateBpm: z.number().int().min(20).max(300).optional(),
  temperatureC: z.number().min(34).max(42).optional(),
  spo2Percent: z.number().int().min(0).max(100).optional(),
  respiratoryRate: z.number().int().min(5).max(60).optional(),
  glucoseMgDl: z.number().int().min(20).max(600).optional(),
})

const CreateNoteSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional(),
  chiefComplaint: z.string().optional(),
  physicalExam: z.string().optional(),
  diagnoses: z.array(DiagnosisSchema).optional(),
  treatmentPlan: z.string().optional(),
  evolutionNotes: z.string().optional(),
  reviewOfSystems: z.record(z.unknown()).optional(),
  vitalSigns: VitalSignsSchema.optional(),
})

const UpdateNoteSchema = CreateNoteSchema.partial()

export async function clinicalNotesRoutes(server: FastifyInstance) {
  // GET /api/clinical-notes — for a patient
  server.get('/', { preHandler: requireStaff }, async (request, reply) => {
    const { clinicId } = request.authUser
    const query = request.query as { patientId?: string; page?: string; limit?: string }

    if (!query.patientId) {
      return Errors.VALIDATION(reply, { patientId: 'Required' })
    }

    const page = parseInt(query.page ?? '1', 10)
    const limit = parseInt(query.limit ?? '10', 10)

    const [notes, total] = await Promise.all([
      prisma.clinicalNote.findMany({
        where: { patientId: query.patientId, clinicId },
        include: {
          doctor: { select: { id: true, firstName: true, lastName: true, licenseNumber: true } },
          vitalSigns: true,
          _count: { select: { prescriptions: true, labResults: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.clinicalNote.count({ where: { patientId: query.patientId, clinicId } }),
    ])

    return reply.send({
      data: notes,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  })

  // GET /api/clinical-notes/:id
  server.get('/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const note = await prisma.clinicalNote.findFirst({
      where: { id, clinicId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true, gender: true, allergies: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, licenseNumber: true, specialty: true, institution: true, signatureUrl: true } },
        appointment: { select: { id: true, startsAt: true, mode: true, appointmentType: true } },
        vitalSigns: true,
        prescriptions: { include: { items: { include: { medication: true } } } },
        labResults: true,
      },
    })

    if (!note) return Errors.NOT_FOUND(reply, 'Clinical note')

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'READ',
      resourceType: 'ClinicalNote',
      resourceId: id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.send({ data: note })
  })

  // POST /api/clinical-notes
  server.post('/', { preHandler: requireDoctor }, async (request, reply) => {
    const parsed = CreateNoteSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const { clinicId, authUserId, role, doctorId } = request.authUser
    if (!doctorId) return Errors.FORBIDDEN(reply)

    const data = parsed.data

    // Verify patient belongs to clinic
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, clinicId } })
    if (!patient) return Errors.NOT_FOUND(reply, 'Patient')

    const note = await prisma.clinicalNote.create({
      data: {
        clinicId,
        patientId: data.patientId,
        doctorId,
        appointmentId: data.appointmentId,
        chiefComplaint: data.chiefComplaint,
        physicalExam: data.physicalExam,
        diagnoses: data.diagnoses ?? [],
        treatmentPlan: data.treatmentPlan,
        evolutionNotes: data.evolutionNotes,
        reviewOfSystems: data.reviewOfSystems,
        status: 'DRAFT',
        ...(data.vitalSigns ? {
          vitalSigns: {
            create: {
              patientId: data.patientId,
              ...data.vitalSigns,
              bmi: data.vitalSigns.weightKg && data.vitalSigns.heightCm
                ? parseFloat(
                    (data.vitalSigns.weightKg / Math.pow(data.vitalSigns.heightCm / 100, 2)).toFixed(2)
                  )
                : undefined,
            },
          },
        } : {}),
      },
      include: {
        vitalSigns: true,
        doctor: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Update appointment status to IN_PROGRESS if linked
    if (data.appointmentId) {
      await prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { status: 'IN_PROGRESS' },
      }).catch(() => null)
    }

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'CREATE',
      resourceType: 'ClinicalNote',
      resourceId: note.id,
      newValue: note,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.status(201).send({ data: note })
  })

  // PATCH /api/clinical-notes/:id
  server.patch('/:id', { preHandler: requireDoctor }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const parsed = UpdateNoteSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const existing = await prisma.clinicalNote.findFirst({ where: { id, clinicId } })
    if (!existing) return Errors.NOT_FOUND(reply, 'Clinical note')

    if (existing.status === 'SIGNED') {
      return Errors.VALIDATION(reply, { message: 'Signed notes cannot be edited. Create an amendment.' })
    }

    const data = parsed.data
    const updated = await prisma.clinicalNote.update({
      where: { id },
      data: {
        ...(data.chiefComplaint !== undefined ? { chiefComplaint: data.chiefComplaint } : {}),
        ...(data.physicalExam ? { physicalExam: data.physicalExam } : {}),
        ...(data.diagnoses ? { diagnoses: data.diagnoses } : {}),
        ...(data.treatmentPlan !== undefined ? { treatmentPlan: data.treatmentPlan } : {}),
        ...(data.evolutionNotes !== undefined ? { evolutionNotes: data.evolutionNotes } : {}),
        ...(data.reviewOfSystems ? { reviewOfSystems: data.reviewOfSystems } : {}),
        ...(data.vitalSigns ? {
          vitalSigns: {
            upsert: {
              create: {
                patientId: existing.patientId,
                ...data.vitalSigns,
                bmi: data.vitalSigns.weightKg && data.vitalSigns.heightCm
                  ? parseFloat(
                      (data.vitalSigns.weightKg / Math.pow(data.vitalSigns.heightCm / 100, 2)).toFixed(2)
                    )
                  : undefined,
              },
              update: {
                ...data.vitalSigns,
              },
            },
          },
        } : {}),
      },
      include: { vitalSigns: true },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'UPDATE',
      resourceType: 'ClinicalNote',
      resourceId: id,
      previousValue: existing,
      newValue: updated,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.send({ data: updated })
  })

  // POST /api/clinical-notes/:id/sign — NOM-004 electronic signature
  server.post('/:id/sign', { preHandler: requireDoctor }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role, doctorId } = request.authUser
    if (!doctorId) return Errors.FORBIDDEN(reply)

    try {
      // Strict lookup: doctor can only sign their own notes.
      // ADMIN can also sign any note in their clinic (covers takeover scenario).
      const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
      const existing = await prisma.clinicalNote.findFirst({
        where: isAdmin
          ? { id, clinicId }          // ADMIN: any note in clinic
          : { id, clinicId, doctorId }, // DOCTOR: only their own notes
      })
      if (!existing) return Errors.NOT_FOUND(reply, 'Clinical note')
      if (existing.status === 'SIGNED') {
        return Errors.VALIDATION(reply, { message: 'Note already signed' })
      }

      const signed = await prisma.clinicalNote.update({
        where: { id },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
          signedBy: doctorId,
        },
      })

      // Mark appointment complete if linked
      if (signed.appointmentId) {
        await prisma.appointment.update({
          where: { id: signed.appointmentId },
          data: { status: 'COMPLETED' },
        }).catch(() => null)
      }

      await auditLog({
        user: { authUserId, clinicId, role },
        action: 'SIGN',
        resourceType: 'ClinicalNote',
        resourceId: id,
        metadata: { signedAs: role, signingDoctorId: doctorId, noteOwnerId: existing.doctorId },
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      })

      return reply.send({ data: signed })
    } catch (err) {
      return Errors.INTERNAL(reply, err)
    }
  })

  // POST /api/clinical-notes/:id/amend — create amendment (NOM-004)
  server.post('/:id/amend', { preHandler: requireDoctor }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role, doctorId } = request.authUser
    if (!doctorId) return Errors.FORBIDDEN(reply)

    const original = await prisma.clinicalNote.findFirst({ where: { id, clinicId } })
    if (!original) return Errors.NOT_FOUND(reply, 'Clinical note')
    if (original.status !== 'SIGNED') {
      return Errors.VALIDATION(reply, { message: 'Only signed notes can be amended' })
    }

    // NOM-004: block a new amendment if an unsigned draft amendment already exists
    const existingDraftAmendment = await prisma.clinicalNote.findFirst({
      where: { amendedFromId: id, status: { not: 'SIGNED' } },
      select: { id: true },
    })
    if (existingDraftAmendment) {
      return Errors.VALIDATION(reply, {
        message: 'Ya existe una enmienda sin firmar. Firma la enmienda anterior antes de crear una nueva.',
      })
    }

    const amendment = await prisma.clinicalNote.create({
      data: {
        clinicId,
        patientId: original.patientId,
        doctorId,
        appointmentId: original.appointmentId,
        chiefComplaint: original.chiefComplaint,
        physicalExam: original.physicalExam ?? undefined,
        diagnoses: original.diagnoses,
        treatmentPlan: original.treatmentPlan,
        evolutionNotes: original.evolutionNotes,
        status: 'DRAFT',
        amendedFromId: id,
      },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'UPDATE',
      resourceType: 'ClinicalNote',
      resourceId: amendment.id,
      metadata: { amendedFromId: id },
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.status(201).send({ data: amendment })
  })
}
