import type { FastifyReply } from 'fastify'

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  message: string,
  details?: unknown
) {
  return reply.status(statusCode).send({
    error: { message, ...(details ? { details } : {}) },
  })
}

export const Errors = {
  UNAUTHORIZED: (reply: FastifyReply) =>
    sendError(reply, 401, 'Unauthorized'),
  FORBIDDEN: (reply: FastifyReply) =>
    sendError(reply, 403, 'Forbidden — insufficient permissions'),
  NOT_FOUND: (reply: FastifyReply, resource = 'Resource') =>
    sendError(reply, 404, `${resource} not found`),
  VALIDATION: (reply: FastifyReply, details: unknown) =>
    sendError(reply, 422, 'Validation error', details),
  INTERNAL: (reply: FastifyReply, err?: unknown) => {
    console.error('[INTERNAL ERROR]', err)
    return sendError(reply, 500, 'Internal server error')
  },
}
