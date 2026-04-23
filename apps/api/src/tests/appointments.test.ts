/**
 * Test 1 — Fase 4:
 * POST /api/appointments → auditLog es llamado tras crear la cita
 */
import { describe, it, expect, vi } from 'vitest'
import { createRouteServer, mockSupabaseUser } from './helpers.js'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuditLog = vi.fn().mockResolvedValue(undefined)
vi.mock('../middleware/audit.js', () => ({ auditLog: mockAuditLog }))

vi.mock('../lib/supabase.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/supabase.js')>()
  return { ...original, verifySupabaseToken: vi.fn() }
})

const now = new Date()
const mockAppointment = {
  id: 'appt-1',
  clinicId: 'clinic-1',
  patientId: 'pat-1',
  doctorId: 'doc-1',
  startsAt: now,
  endsAt: new Date(now.getTime() + 3600_000),
  patient: { id: 'pat-1', firstName: 'Ana', lastName: 'García', phone: null },
  doctor: { id: 'doc-1', firstName: 'Dra.', lastName: 'Pérez' },
  appointmentType: { id: 'type-1', name: 'Consulta' },
}

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    doctor: {
      findFirst: vi.fn()
        .mockResolvedValueOnce({ id: 'doc-auth' }) // authenticate() — lookup ADMIN doctor record
        .mockResolvedValueOnce({ id: 'doc-1' }),   // route — resolve doctor to assign
    },
    patient: { findFirst: vi.fn().mockResolvedValue({ id: 'pat-1', clinicId: 'clinic-1' }) },
    appointment: {
      findFirst: vi.fn().mockResolvedValue(null), // no conflict
      create: vi.fn().mockResolvedValue(mockAppointment),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}))

// ── Test ──────────────────────────────────────────────────────────────────────

describe('POST /api/appointments', () => {
  it('calls auditLog with CREATE + resourceType Appointment', async () => {
    const { verifySupabaseToken } = await import('../lib/supabase.js')
    vi.mocked(verifySupabaseToken).mockResolvedValue(mockSupabaseUser('ADMIN') as any)

    const { appointmentsRoutes } = await import('../routes/appointments.js')
    const server = await createRouteServer(appointmentsRoutes, '/api/appointments')

    const res = await server.inject({
      method: 'POST',
      url: '/api/appointments',
      headers: { authorization: 'Bearer fake-token', 'content-type': 'application/json' },
      payload: {
        patientId: 'pat-1',
        doctorId: 'doc-1',
        startsAt: new Date(Date.now() + 3_600_000).toISOString(),
        endsAt: new Date(Date.now() + 7_200_000).toISOString(),
        mode: 'IN_PERSON',
      },
    })

    expect(res.statusCode).toBe(201)
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        resourceType: 'Appointment',
        resourceId: 'appt-1',
      })
    )

    await server.close()
  })
})
