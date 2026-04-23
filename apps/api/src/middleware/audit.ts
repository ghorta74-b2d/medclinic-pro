import { prisma } from '../lib/prisma.js'
import type { AuthUser } from './auth.js'
import type { AuditAction } from '../../generated/index.js'

interface AuditParams {
  user: AuthUser
  action: AuditAction
  resourceType: string
  resourceId: string
  previousValue?: unknown
  newValue?: unknown
  metadata?: Record<string, unknown>
  /** Client IP address — captured from request.ip */
  ip?: string
  /** User-Agent header — captured from request.headers['user-agent'] */
  userAgent?: string | string[]
}

/**
 * Append-only audit log — NOM-004-SSA3-2012 compliance.
 *
 * THROWS on failure: if the audit record cannot be written, the operation is
 * not demonstrably compliant and must surface as an error. Callers that use
 * fire-and-forget semantics (takeover, reassignment notifications) catch
 * explicitly via .catch().
 */
export async function auditLog(params: AuditParams): Promise<void> {
  const meta: Record<string, unknown> = {
    ...(params.metadata ?? {}),
    ...(params.ip ? { ip: params.ip } : {}),
    ...(params.userAgent
      ? { userAgent: Array.isArray(params.userAgent) ? params.userAgent[0] : params.userAgent }
      : {}),
  }

  await prisma.auditLog.create({
    data: {
      clinicId: params.user.clinicId,
      userId: params.user.authUserId,
      userRole: params.user.role,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      previousValue: params.previousValue
        ? (params.previousValue as object)
        : undefined,
      newValue: params.newValue
        ? (params.newValue as object)
        : undefined,
      metadata: Object.keys(meta).length > 0 ? (meta as object) : undefined,
    },
  })
}
