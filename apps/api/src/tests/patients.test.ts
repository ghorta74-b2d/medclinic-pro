/**
 * Test 2 — Fase 4:
 * DELETE /api/patients/:id → soft delete (isActive: false), nunca borrado físico
 */
import { describe, it, expect, vi } from 'vitest'
import { createRouteServer, mockSupabaseUser } from './helpers.js'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../middleware/audit.js', () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../lib/supabase.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/supabase.js')>()
  return { ...original, verifySupabaseToken: vi.fn() }
})

const mockPatientUpdate = vi.fn().mockResolvedValue({ id: 'pat-1', isActive: false })
const mockPatientDelete = vi.fn()

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    doctor: { findFirst: vi.fn().mockResolvedValue({ id: 'doc-auth' }) },
    patient: {
      findFirst: vi.fn().mockResolvedValue({ id: 'pat-1', clinicId: 'clinic-1', isActive: true }),
      update: mockPatientUpdate,
      delete: mockPatientDelete,
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}))

// ── Test ──────────────────────────────────────────────────────────────────────

describe('DELETE /api/patients/:id', () => {
  it('soft deletes (update isActive:false) instead of physical delete', async () => {
    const { verifySupabaseToken } = await import('../lib/supabase.js')
    vi.mocked(verifySupabaseToken).mockResolvedValue(mockSupabaseUser('ADMIN') as any)

    const { patientsRoutes } = await import('../routes/patients.js')
    const server = await createRouteServer(patientsRoutes, '/api/patients')

    const res = await server.inject({
      method: 'DELETE',
      url: '/api/patients/pat-1',
      headers: { authorization: 'Bearer fake-token' },
    })

    expect(res.statusCode).toBe(204)
    expect(mockPatientUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) })
    )
    expect(mockPatientDelete).not.toHaveBeenCalled()

    await server.close()
  })
})
