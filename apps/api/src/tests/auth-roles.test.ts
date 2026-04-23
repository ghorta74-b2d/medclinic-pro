/**
 * Tests 3 & 4 — Fase 4:
 * - PATCH /api/configuracion/clinic → 403 para roles != ADMIN
 * - GET  /api/patients/:id/data-export → 403 para STAFF
 */
import { describe, it, expect, vi } from 'vitest'
import { createRouteServer, mockSupabaseUser } from './helpers.js'

// ── Mocks (hoisted antes de cualquier import dinámico) ────────────────────────

vi.mock('../lib/supabase.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/supabase.js')>()
  return { ...original, verifySupabaseToken: vi.fn() }
})

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    doctor: { findFirst: vi.fn().mockResolvedValue({ id: 'doc-1' }) },
    clinic: { findUnique: vi.fn() },
    patient: { findFirst: vi.fn(), findMany: vi.fn() },
    appointment: { findMany: vi.fn() },
    clinicalNote: { findMany: vi.fn() },
    prescription: { findMany: vi.fn() },
    labResult: { findMany: vi.fn() },
    insurance: { findMany: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupVerifyToken(role: string) {
  const { verifySupabaseToken } = await import('../lib/supabase.js')
  vi.mocked(verifySupabaseToken).mockResolvedValue(mockSupabaseUser(role) as any)
}

// ── Tests: PATCH /configuracion/clinic ───────────────────────────────────────

describe('PATCH /api/configuracion/clinic — requireAdmin', () => {
  it('returns 403 when caller is DOCTOR', async () => {
    await setupVerifyToken('DOCTOR')
    const { configuracionRoutes } = await import('../routes/configuracion.js')
    const server = await createRouteServer(configuracionRoutes, '/api/configuracion')

    const res = await server.inject({
      method: 'PATCH',
      url: '/api/configuracion/clinic',
      headers: { authorization: 'Bearer fake-token', 'content-type': 'application/json' },
      payload: { name: 'Test' },
    })

    expect(res.statusCode).toBe(403)
    await server.close()
  })

  it('returns 403 when caller is STAFF', async () => {
    await setupVerifyToken('STAFF')
    const { configuracionRoutes } = await import('../routes/configuracion.js')
    const server = await createRouteServer(configuracionRoutes, '/api/configuracion')

    const res = await server.inject({
      method: 'PATCH',
      url: '/api/configuracion/clinic',
      headers: { authorization: 'Bearer fake-token', 'content-type': 'application/json' },
      payload: { name: 'Test' },
    })

    expect(res.statusCode).toBe(403)
    await server.close()
  })
})

// ── Tests: GET /patients/:id/data-export ─────────────────────────────────────

describe('GET /api/patients/:id/data-export — STAFF bloqueado', () => {
  it('returns 403 when caller is STAFF', async () => {
    await setupVerifyToken('STAFF')
    const { patientsRoutes } = await import('../routes/patients.js')
    const server = await createRouteServer(patientsRoutes, '/api/patients')

    const res = await server.inject({
      method: 'GET',
      url: '/api/patients/patient-xyz/data-export',
      headers: { authorization: 'Bearer fake-token' },
    })

    expect(res.statusCode).toBe(403)
    await server.close()
  })
})
