/**
 * Tests — ScheduleBlock (bloqueos de horario)
 * POST crea + auditLog CREATE; validación de rango; DELETE 204 + auditLog DELETE
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouteServer, mockSupabaseUser } from './helpers.js'

const mockAuditLog = vi.fn().mockResolvedValue(undefined)
vi.mock('../middleware/audit.js', () => ({ auditLog: mockAuditLog }))

vi.mock('../lib/supabase.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/supabase.js')>()
  return { ...original, verifySupabaseToken: vi.fn() }
})

const mockBlock = {
  id: 'block-1',
  clinicId: 'clinic-1',
  doctorId: 'doc-1',
  startsAt: new Date(),
  endsAt: new Date(Date.now() + 3600_000),
  reason: 'MEAL',
  note: null,
  doctor: { id: 'doc-1', firstName: 'Dra.', lastName: 'Pérez', specialty: null },
}

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    doctor: { findFirst: vi.fn().mockResolvedValue({ id: 'doc-1', clinicId: 'clinic-1' }) },
    scheduleBlock: {
      findFirst: vi.fn().mockResolvedValue(mockBlock),
      create: vi.fn().mockResolvedValue(mockBlock),
      delete: vi.fn().mockResolvedValue(mockBlock),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}))

beforeEach(() => { mockAuditLog.mockClear() })

describe('POST /api/blocks', () => {
  it('creates a block and audits CREATE ScheduleBlock', async () => {
    const { verifySupabaseToken } = await import('../lib/supabase.js')
    vi.mocked(verifySupabaseToken).mockResolvedValue(mockSupabaseUser('ADMIN') as any)

    const { blocksRoutes } = await import('../routes/blocks.js')
    const server = await createRouteServer(blocksRoutes, '/api/blocks')

    const res = await server.inject({
      method: 'POST',
      url: '/api/blocks',
      headers: { authorization: 'Bearer fake-token', 'content-type': 'application/json' },
      payload: {
        doctorId: 'doc-1',
        startsAt: new Date(Date.now() + 3_600_000).toISOString(),
        endsAt: new Date(Date.now() + 7_200_000).toISOString(),
        reason: 'MEAL',
      },
    })

    expect(res.statusCode).toBe(201)
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', resourceType: 'ScheduleBlock', resourceId: 'block-1' })
    )
    await server.close()
  })

  it('rejects when endsAt is not after startsAt', async () => {
    const { verifySupabaseToken } = await import('../lib/supabase.js')
    vi.mocked(verifySupabaseToken).mockResolvedValue(mockSupabaseUser('ADMIN') as any)

    const { blocksRoutes } = await import('../routes/blocks.js')
    const server = await createRouteServer(blocksRoutes, '/api/blocks')

    const ts = new Date(Date.now() + 3_600_000).toISOString()
    const res = await server.inject({
      method: 'POST',
      url: '/api/blocks',
      headers: { authorization: 'Bearer fake-token', 'content-type': 'application/json' },
      payload: { doctorId: 'doc-1', startsAt: ts, endsAt: ts, reason: 'OTHER' },
    })

    expect(res.statusCode).toBe(400)
    await server.close()
  })
})

describe('DELETE /api/blocks/:id', () => {
  it('deletes a block and audits DELETE', async () => {
    const { verifySupabaseToken } = await import('../lib/supabase.js')
    vi.mocked(verifySupabaseToken).mockResolvedValue(mockSupabaseUser('ADMIN') as any)

    const { blocksRoutes } = await import('../routes/blocks.js')
    const server = await createRouteServer(blocksRoutes, '/api/blocks')

    const res = await server.inject({
      method: 'DELETE',
      url: '/api/blocks/block-1',
      headers: { authorization: 'Bearer fake-token' },
    })

    expect(res.statusCode).toBe(204)
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', resourceType: 'ScheduleBlock', resourceId: 'block-1' })
    )
    await server.close()
  })
})
