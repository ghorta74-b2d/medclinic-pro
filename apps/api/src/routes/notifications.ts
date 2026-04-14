import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate)

  // GET /api/notifications — list for current user (most recent first)
  fastify.get('/', async (request) => {
    const { authUserId } = request.authUser
    const notifications = await prisma.notification.findMany({
      where: { userId: authUserId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    return { data: notifications }
  })

  // GET /api/notifications/unread-count
  fastify.get('/unread-count', async (request) => {
    const { authUserId } = request.authUser
    const count = await prisma.notification.count({
      where: { userId: authUserId, read: false },
    })
    return { data: { count } }
  })

  // PATCH /api/notifications/read-all
  fastify.patch('/read-all', async (request) => {
    const { authUserId } = request.authUser
    await prisma.notification.updateMany({
      where: { userId: authUserId, read: false },
      data: { read: true },
    })
    return { data: { ok: true } }
  })

  // PATCH /api/notifications/:id/read
  fastify.patch('/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { authUserId } = request.authUser
    const notif = await prisma.notification.findUnique({ where: { id } })
    if (!notif || notif.userId !== authUserId) return Errors.NOT_FOUND(reply, 'Notificación')
    await prisma.notification.update({ where: { id }, data: { read: true } })
    return { data: { ok: true } }
  })
}
