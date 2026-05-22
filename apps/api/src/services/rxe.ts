import { createHmac, randomBytes } from 'crypto'
import { prisma } from '../lib/prisma.js'

// URL-safe random slug — nanoid replacement (nanoid v5 is ESM-only, incompatible with CJS)
function generateSlug(size = 10): string {
  return randomBytes(Math.ceil(size * 3 / 4))
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    .slice(0, size)
}

const RXE_SECRET = process.env['RXE_SECRET'] ?? 'dev-rxe-secret-change-in-production'
const RXE_TTL_DAYS = 14

export function buildPublicUrl(slug: string): string {
  const base = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
  return `${base}/r/${slug}`
}

export async function generateRxe(prescriptionId: string, clinicId: string) {
  const existing = await prisma.prescription.findFirst({
    where: { id: prescriptionId, clinicId },
    select: { id: true },
  })
  if (!existing) throw new Error('Prescription not found')

  const publicSlug = generateSlug(10)
  // HMAC-SHA256 of prescriptionId: deterministic sello, never exposes PII
  const signature = createHmac('sha256', RXE_SECRET)
    .update(prescriptionId)
    .digest('hex')
    .slice(0, 32)

  const expiresAt = new Date(Date.now() + RXE_TTL_DAYS * 24 * 60 * 60 * 1000)

  await prisma.$transaction([
    prisma.prescription.update({
      where: { id: prescriptionId },
      data: { publicSlug, signature, rxeStatus: 'ACTIVE', rxeGeneratedAt: new Date(), expiresAt },
    }),
    prisma.rxEvent.create({
      data: { prescriptionId, type: 'RXE_GENERATED', metadata: { publicSlug, expiresAt } },
    }),
  ])

  return { publicSlug, signature, expiresAt }
}

export async function getPublicRxData(slug: string) {
  const rx = await prisma.prescription.findUnique({
    where: { publicSlug: slug },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      doctor: { select: { firstName: true, lastName: true, specialty: true, licenseNumber: true } },
      items: {
        select: {
          id: true, medicationName: true, dose: true, route: true,
          frequency: true, duration: true, quantity: true, instructions: true,
          fraction: true, boughtQty: true, sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
      // Prescription has no direct clinic relation; query separately below
    },
  })

  if (!rx) return null

  // Fetch clinic separately since Prescription only stores clinicId (no relation field)
  const clinic = await prisma.clinic.findUnique({
    where: { id: rx.clinicId },
    select: { name: true, logoUrl: true, phone: true },
  })

  const isExpired = rx.expiresAt ? rx.expiresAt < new Date() : false

  // Fire-and-forget — non-critical
  prisma.rxEvent
    .create({ data: { prescriptionId: rx.id, type: 'VIEWED', metadata: { slug } } })
    .catch(() => {})

  return {
    expired: isExpired,
    prescription: {
      id: rx.id,
      publicSlug: rx.publicSlug,
      // First 8 hex chars as visible receipt ID — short, unambiguous
      receiptId: rx.signature?.slice(0, 8) ?? rx.id.slice(0, 8),
      expiresAt: rx.expiresAt,
      status: rx.status,
      rxeStatus: rx.rxeStatus,
      instructions: rx.instructions,
      followUpDate: rx.followUpDate,
      createdAt: rx.createdAt,
      pdfUrl: rx.pdfUrl,
    },
    items: rx.items,
    // LFPDPPP: apellido enmascarado (solo inicial) — Art. 8 aviso simplificado
    patient: {
      firstName: rx.patient.firstName,
      lastName: rx.patient.lastName.charAt(0) + '.',
    },
    doctor: rx.doctor,
    clinic,
  }
}
