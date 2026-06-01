import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireStaff } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { Errors } from '../lib/errors.js'

// ── Schemas ─────────────────────────────────────────────────

const CreateBlockSchema = z.object({
  doctorId: z.string(),
  startsAt: z.string().datetime(),
  endsAt:   z.string().datetime(),
  reason:   z.enum(['VACATION', 'MEAL', 'PERSONAL', 'OTHER']).default('OTHER'),
  note:     z.string().optional(),
})

const UpdateBlockSchema = z.object({
  startsAt: z.string().datetime().optional(),
  endsAt:   z.string().datetime().optional(),
  reason:   z.enum(['VACATION', 'MEAL', 'PERSONAL', 'OTHER']).optional(),
  note:     z.string().optional(),
})

// ── Routes ───────────────────────────────────────────────────

export async function blocksRoutes(server: FastifyInstance) {
  // GET /api/blocks — list blocks by date range / doctor
  server.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { clinicId } = request.authUser
    const query = request.query as { from?: string; to?: string; doctorId?: string }

    const where: Record<string, unknown> = { clinicId }
    if (query.from || query.to) {
      where['startsAt'] = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      }
    }
    if (query.doctorId) where['doctorId'] = query.doctorId

    const blocks = await prisma.scheduleBlock.findMany({
      where,
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      },
      orderBy: { startsAt: 'asc' },
    })

    return reply.send({ data: blocks })
  })

  // POST /api/blocks — create a schedule block
  server.post('/', { preHandler: requireStaff }, async (request, reply) => {
    const parsed = CreateBlockSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const { clinicId, authUserId, role } = request.authUser
    const data = parsed.data

    if (new Date(data.endsAt) <= new Date(data.startsAt)) {
      return reply.status(400).send({ error: { message: 'La hora de fin debe ser posterior a la de inicio.' } })
    }

    // Verify doctor belongs to this clinic
    const doctor = await prisma.doctor.findFirst({ where: { id: data.doctorId, clinicId } })
    if (!doctor) return Errors.NOT_FOUND(reply, 'Doctor')

    const block = await prisma.scheduleBlock.create({
      data: {
        clinicId,
        doctorId: data.doctorId,
        startsAt: new Date(data.startsAt),
        endsAt:   new Date(data.endsAt),
        reason:   data.reason,
        note:     data.note,
        createdBy: authUserId,
      },
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'CREATE',
      resourceType: 'ScheduleBlock',
      resourceId: block.id,
      newValue: { doctorId: data.doctorId, startsAt: data.startsAt, endsAt: data.endsAt, reason: data.reason },
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.status(201).send({ data: block })
  })

  // PATCH /api/blocks/:id — move / resize / edit a block
  server.patch('/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser
    const parsed = UpdateBlockSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const existing = await prisma.scheduleBlock.findFirst({ where: { id, clinicId } })
    if (!existing) return Errors.NOT_FOUND(reply, 'ScheduleBlock')

    const data = parsed.data
    const nextStart = data.startsAt ? new Date(data.startsAt) : existing.startsAt
    const nextEnd   = data.endsAt   ? new Date(data.endsAt)   : existing.endsAt
    if (nextEnd <= nextStart) {
      return reply.status(400).send({ error: { message: 'La hora de fin debe ser posterior a la de inicio.' } })
    }

    const updated = await prisma.scheduleBlock.update({
      where: { id },
      data: {
        ...(data.startsAt ? { startsAt: nextStart } : {}),
        ...(data.endsAt ? { endsAt: nextEnd } : {}),
        ...(data.reason ? { reason: data.reason } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      },
    })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'UPDATE',
      resourceType: 'ScheduleBlock',
      resourceId: id,
      previousValue: { startsAt: existing.startsAt, endsAt: existing.endsAt, reason: existing.reason },
      newValue: { startsAt: nextStart, endsAt: nextEnd, reason: updated.reason },
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.send({ data: updated })
  })

  // DELETE /api/blocks/:id
  server.delete('/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId, role } = request.authUser

    const existing = await prisma.scheduleBlock.findFirst({ where: { id, clinicId } })
    if (!existing) return Errors.NOT_FOUND(reply, 'ScheduleBlock')

    await prisma.scheduleBlock.delete({ where: { id } })

    await auditLog({
      user: { authUserId, clinicId, role },
      action: 'DELETE',
      resourceType: 'ScheduleBlock',
      resourceId: id,
      previousValue: { doctorId: existing.doctorId, startsAt: existing.startsAt, endsAt: existing.endsAt },
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    return reply.status(204).send()
  })
}
