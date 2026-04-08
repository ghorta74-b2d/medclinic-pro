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
}

/**
 * Append-only audit log — NOM-004-SSA3-2012 compliance.
 * Never throws; audit failure must not block clinical operations.
 */
export async function auditLog(params: AuditParams): Promise<void> {
  try {
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
        metadata: params.metadata,
      },
    })
  } catch (err) {
    // Log to stderr but don't rethrow — audit must not break clinical ops
    console.error('[AUDIT LOG FAILED]', err)
  }
}
