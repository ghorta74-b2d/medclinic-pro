import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifySupabaseToken } from '../lib/supabase.js'
import { prisma } from '../lib/prisma.js'
import { Errors } from '../lib/errors.js'
import type { Role } from '../../generated/index.js'

export interface AuthUser {
  authUserId: string
  clinicId: string
  role: Role
  doctorId?: string
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return Errors.UNAUTHORIZED(reply)
  }

  const token = authHeader.slice(7)
  const supabaseUser = await verifySupabaseToken(token)

  if (!supabaseUser) {
    return Errors.UNAUTHORIZED(reply)
  }

  // Pull clinic_id and role from user metadata (set at signup/invite)
  const meta = supabaseUser.user_metadata as {
    clinic_id?: string
    role?: Role
  }

  if (!meta.role) {
    return Errors.FORBIDDEN(reply)
  }

  // SUPER_ADMIN doesn't belong to a specific clinic
  if (meta.role === 'SUPER_ADMIN') {
    request.authUser = {
      authUserId: supabaseUser.id,
      clinicId: 'SUPERADMIN',
      role: 'SUPER_ADMIN' as Role,
    }
    return
  }

  if (!meta.clinic_id) {
    return Errors.FORBIDDEN(reply)
  }

  // Find doctor record if role is DOCTOR
  let doctorId: string | undefined
  if (meta.role === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({
      where: { authUserId: supabaseUser.id },
      select: { id: true },
    })
    doctorId = doctor?.id
  }

  request.authUser = {
    authUserId: supabaseUser.id,
    clinicId: meta.clinic_id,
    role: meta.role,
    doctorId,
  }
}

export function requireRoles(...roles: Role[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply)
    if (reply.sent) return

    if (!roles.includes(request.authUser.role)) {
      return Errors.FORBIDDEN(reply)
    }
  }
}

// Shorthand guards
export const requireDoctor = requireRoles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
export const requireStaff = requireRoles('DOCTOR', 'ADMIN', 'STAFF', 'SUPER_ADMIN')
export const requireAdmin = requireRoles('ADMIN', 'SUPER_ADMIN')
