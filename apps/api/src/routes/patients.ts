import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireStaff } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { Errors } from '../lib/errors.js'

const CreatePatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  bloodType: z.enum(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG', 'UNKNOWN']).optional(),
  curp: z.string().length(18).optional(),
  rfc: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  familyHistory: z.record(z.unknown()).optional(),
  personalHistory: z.record(z.unknown()).optional(),
  surgicalHistory: z.array(z.string()).optional(),
  privacyConsentAt: z.string().datetime().optional(),
  dataConsentAt: z.string().datetime().optional(),
  notes: z.string().optional(),
})

const UpdatePatientSchema = CreatePatientSchema.partial()

export async function patientsRoutes(server: FastifyInstance) {
  // GET /api/patients — search + list
  server.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.authUser
    const query = request.query as { q?: string; page?: string; limit?: string }

    const page = parseInt(query.page ?? '1', 10)
    const limit = parseInt(query.limit ?? '20', 10)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { clinicId, isActive: true }

    if (query.q) {
      where['OR'] = [
        { firstName: { contains: query.q, mode: 'insensitive' } },
        { lastName: { contains: query.q, mode: 'insensitive' } },
        { phone: { contains: query.q } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { curp: { equals: query.q.toUpperCase() } },
      ]
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          dateOfBirth: true,
          gender: true,
          createdAt: true,
          _count: { select: { appointments: true } },
        },
        orderBy: { lastName: 'asc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where }),
    ])

    return reply.send({
      data: patients,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  })

  // GET /api/patients/:id
  server.get('/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const patient = await prisma.patient.findFirst({
      where: { id, clinicId },
      include: {
        insurances: { where: { isActive: true } },
        _count: {
          select: { appointments: true, clinicalNotes: true, prescriptions: true, labResults: true },
        },
      },
    })

    if (!patient) return Errors.NOT_FOUND(reply, 'Patient')

    // Audit: reading a patient record
    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'READ',
      resourceType: 'Patient',
      resourceId: id,
    })

    return reply.send({ data: patient })
  })

  // GET /api/patients/:id/timeline — chronological view of all clinical events
  server.get('/:id/timeline', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId } = request.authUser

    const patient = await prisma.patient.findFirst({ where: { id, clinicId }, select: { id: true } })
    if (!patient) return Errors.NOT_FOUND(reply, 'Patient')

    const [appointments, notes, prescriptions, labResults] = await Promise.all([
      prisma.appointment.findMany({
        where: { patientId: id, clinicId },
        include: {
          doctor: { select: { firstName: true, lastName: true } },
          appointmentType: { select: { name: true, color: true } },
        },
        orderBy: { startsAt: 'desc' },
      }),
      prisma.clinicalNote.findMany({
        where: { patientId: id, clinicId },
        include: {
          doctor: { select: { firstName: true, lastName: true } },
          vitalSigns: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.prescription.findMany({
        where: { patientId: id, clinicId },
        include: {
          items: { include: { medication: true } },
          doctor: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.labResult.findMany({
        where: { patientId: id, clinicId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return reply.send({
      data: { appointments, notes, prescriptions, labResults },
    })
  })

  // POST /api/patients
  server.post('/', { preHandler: requireStaff }, async (request, reply) => {
    const parsed = CreatePatientSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const { clinicId, authUserId, role } = request.authUser
    const data = parsed.data

    // Check for duplicate phone in this clinic
    const existing = await prisma.patient.findFirst({
      where: { clinicId, phone: data.phone },
    })
    if (existing) {
      return Errors.VALIDATION(reply, { phone: 'Phone number already registered' })
    }

    const patient = await prisma.patient.create({
      data: {
        clinicId,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        bloodType: data.bloodType ?? 'UNKNOWN',
        curp: data.curp,
        rfc: data.rfc,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
        emergencyRelation: data.emergencyRelation,
        allergies: data.allergies ?? [],
        chronicConditions: data.chronicConditions ?? [],
        currentMedications: data.currentMedications ?? [],
        familyHistory: data.familyHistory,
        personalHistory: data.personalHistory,
        surgicalHistory: data.surgicalHistory ?? [],
        privacyConsentAt: data.privacyConsentAt ? new Date(data.privacyConsentAt) : undefined,
        dataConsentAt: data.dataConsentAt ? new Date(data.dataConsentAt) : undefined,
        notes: data.notes,
      },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'CREATE',
      resourceType: 'Patient',
      resourceId: patient.id,
      newValue: patient,
    })

    return reply.status(201).send({ data: patient })
  })

  // PATCH /api/patients/:id
  server.patch('/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const parsed = UpdatePatientSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const existing = await prisma.patient.findFirst({ where: { id, clinicId } })
    if (!existing) return Errors.NOT_FOUND(reply, 'Patient')

    const data = parsed.data
    const updated = await prisma.patient.update({
      where: { id },
      data: {
        ...data,
        ...(data.dateOfBirth ? { dateOfBirth: new Date(data.dateOfBirth) } : {}),
        ...(data.privacyConsentAt ? { privacyConsentAt: new Date(data.privacyConsentAt) } : {}),
        ...(data.dataConsentAt ? { dataConsentAt: new Date(data.dataConsentAt) } : {}),
      },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'UPDATE',
      resourceType: 'Patient',
      resourceId: id,
      previousValue: existing,
      newValue: updated,
    })

    return reply.send({ data: updated })
  })

  // DELETE /api/patients/:id — soft delete
  server.delete('/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const existing = await prisma.patient.findFirst({ where: { id, clinicId } })
    if (!existing) return Errors.NOT_FOUND(reply, 'Patient')

    await prisma.patient.update({ where: { id }, data: { isActive: false } })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'DELETE',
      resourceType: 'Patient',
      resourceId: id,
    })

    return reply.status(204).send()
  })
}
