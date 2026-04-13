import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireStaff } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { createStripePaymentLink } from '../services/stripe.js'
import { sendWhatsAppMessage } from '../services/whatsapp.js'

const CreateInvoiceSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional(),
  doctorId: z.string().optional(), // ADMIN/STAFF can assign invoice to a specific doctor
  items: z.array(z.object({
    serviceId: z.string().optional(),
    description: z.string().min(1),
    quantity: z.number().positive().default(1),
    unitPrice: z.number().positive(),
    taxRate: z.number().min(0).max(1).default(0),
    insuranceId: z.string().optional(),
    insuranceCovers: z.number().min(0).optional(),
  })).min(1),
  notes: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD in client timezone
  payment: z.object({
    method: z.enum(['CASH', 'CARD', 'TRANSFER', 'INSURANCE', 'STRIPE_ONLINE']),
    reference: z.string().optional(),
    insurerName: z.string().optional(),
  }).optional(),
})

const RecordPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'INSURANCE', 'STRIPE_ONLINE']),
  reference: z.string().optional(),
  notes: z.string().optional(),
  insurerName: z.string().optional(),
})

export async function billingRoutes(server: FastifyInstance) {
  // GET /api/billing/services — service catalog
  server.get('/services', { preHandler: requireStaff }, async (request, reply) => {
    const { clinicId } = request.authUser

    const services = await prisma.service.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: 'asc' },
    })

    return reply.send({ data: services })
  })

  // POST /api/billing/services
  server.post('/services', { preHandler: requireStaff }, async (request, reply) => {
    const { clinicId } = request.authUser
    const body = request.body as {
      name: string
      description?: string
      price: number
      category?: string
      taxRate?: number
      taxIncluded?: boolean
    }

    const service = await prisma.service.create({
      data: {
        clinicId,
        name: body.name,
        description: body.description,
        price: body.price,
        category: body.category,
        taxRate: body.taxRate ?? 0.16,
        taxIncluded: body.taxIncluded ?? false,
      },
    })

    return reply.status(201).send({ data: service })
  })

  // PATCH /api/billing/services/:id
  server.patch('/services/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId } = request.authUser
    const body = request.body as {
      name?: string; description?: string; price?: number
      category?: string; taxRate?: number; isActive?: boolean
    }

    const service = await prisma.service.findFirst({ where: { id, clinicId } })
    if (!service) return Errors.NOT_FOUND(reply, 'Service')

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(body.name        !== undefined && { name:        body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price       !== undefined && { price:       body.price }),
        ...(body.category    !== undefined && { category:    body.category }),
        ...(body.taxRate     !== undefined && { taxRate:     body.taxRate }),
        ...(body.isActive    !== undefined && { isActive:    body.isActive }),
      },
    })
    return reply.send({ data: updated })
  })

  // DELETE /api/billing/services/:id — soft delete
  server.delete('/services/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId } = request.authUser

    const service = await prisma.service.findFirst({ where: { id, clinicId } })
    if (!service) return Errors.NOT_FOUND(reply, 'Service')

    await prisma.service.update({ where: { id }, data: { isActive: false } })
    return reply.status(204).send()
  })

  // GET /api/billing/invoices
  server.get('/invoices', { preHandler: requireStaff }, async (request, reply) => {
    const { clinicId, role, doctorId: authDoctorId } = request.authUser
    const query = request.query as {
      patientId?: string
      status?: string
      from?: string
      to?: string
      page?: string
      limit?: string
      doctorId?: string
    }

    const page = parseInt(query.page ?? '1', 10)
    const limit = parseInt(query.limit ?? '20', 10)

    // Determine effective doctorId filter:
    // - DOCTOR → always their own (cannot be overridden)
    // - ADMIN / STAFF → use query param if provided, else global view
    const effectiveDoctorId =
      role === 'DOCTOR' ? authDoctorId :
      query.doctorId ? query.doctorId : undefined

    const where: Record<string, unknown> = { clinicId }
    if (query.patientId) where['patientId'] = query.patientId
    if (query.status) where['status'] = query.status
    if (query.from || query.to) {
      where['issuedAt'] = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      }
    }
    // Filter by doctorId directly (column on Invoice — no join needed, includes standalone invoices)
    if (effectiveDoctorId) {
      where['doctorId'] = effectiveDoctorId
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          items: { include: { service: true } },
          payments: true,
        },
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ])

    return reply.send({
      data: invoices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  })

  // GET /api/billing/invoices/:id
  server.get('/invoices/:id', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId } = request.authUser

    const invoice = await prisma.invoice.findFirst({
      where: { id, clinicId },
      include: {
        patient: true,
        items: { include: { service: true, insurance: true }, orderBy: { sortOrder: 'asc' } },
        payments: true,
        appointment: { select: { id: true, startsAt: true } },
      },
    })

    if (!invoice) return Errors.NOT_FOUND(reply, 'Invoice')
    return reply.send({ data: invoice })
  })

  // POST /api/billing/invoices
  server.post('/invoices', { preHandler: requireStaff }, async (request, reply) => {
    const parsed = CreateInvoiceSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const { clinicId } = request.authUser
    const data = parsed.data

    // Generate invoice number + validate patient in parallel
    // Use findFirst (O(1) via createdAt index) instead of count() (O(n) full scan)
    const clientDate = (request.body as Record<string, unknown>)['localDate'] as string | undefined
    const issuedDate = clientDate ?? new Date().toISOString().slice(0, 10)
    const dateStr = issuedDate.replace(/-/g, '')

    const [patient, lastInvoice] = await Promise.all([
      prisma.patient.findFirst({ where: { id: data.patientId, clinicId } }),
      prisma.invoice.findFirst({
        where: { clinicId },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
      }),
    ])
    if (!patient) return Errors.NOT_FOUND(reply, 'Patient')

    const lastSeq = lastInvoice
      ? parseInt(lastInvoice.invoiceNumber.split('-').pop() ?? '0', 10)
      : 0
    const invoiceNumber = `INV-${dateStr}-${String(lastSeq + 1).padStart(4, '0')}`

    // Calculate totals
    let subtotal = 0
    let taxAmount = 0

    const items = data.items.map((item, i) => {
      const lineTotal = item.quantity * item.unitPrice
      const lineTax = lineTotal * item.taxRate
      subtotal += lineTotal
      taxAmount += lineTax
      return {
        serviceId: item.serviceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        taxAmount: lineTax,
        total: lineTotal + lineTax,
        insuranceId: item.insuranceId,
        insuranceCovers: item.insuranceCovers,
        sortOrder: i,
      }
    })

    const total = subtotal + taxAmount

    // Resolve doctorId for this invoice (used for per-doctor income filtering):
    // 1. If appointmentId provided → derive from appointment
    // 2. Else if DOCTOR/ADMIN caller → use their own doctorId
    // 3. Else if STAFF/ADMIN explicitly passed doctorId in body → use that
    const { role, doctorId: callerDoctorId } = request.authUser
    let resolvedDoctorId: string | undefined

    if (data.appointmentId) {
      const apt = await prisma.appointment.findUnique({
        where: { id: data.appointmentId },
        select: { doctorId: true },
      })
      resolvedDoctorId = apt?.doctorId ?? undefined
    } else if (role === 'DOCTOR' || role === 'ADMIN') {
      resolvedDoctorId = callerDoctorId ?? undefined
    } else if (data.doctorId) {
      resolvedDoctorId = data.doctorId
    }

    const invoice = await prisma.invoice.create({
      data: {
        clinicId,
        patientId: data.patientId,
        appointmentId: data.appointmentId,
        doctorId: resolvedDoctorId,
        invoiceNumber,
        subtotal,
        taxAmount,
        total,
        notes: data.notes,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        items: { create: items },
      },
      include: {
        items: { include: { service: true } },
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    })

    // If payment info was provided, record it and mark invoice as PAID
    if (data.payment) {
      const { authUserId, clinicId: cId } = request.authUser
      // Parallelize: doctor lookup + payment record creation (doc name needed first)
      const editorDoc = await prisma.doctor.findFirst({
        where: { authUserId, clinicId: cId },
        select: { firstName: true, lastName: true },
      })
      const recorderName = editorDoc ? `${editorDoc.firstName} ${editorDoc.lastName}` : authUserId
      // Create payment record and update invoice status in parallel
      await Promise.all([
        prisma.paymentRecord.create({
          data: {
            invoiceId: invoice.id,
            amount: total,
            currency: 'MXN',
            method: data.payment.method,
            reference: data.payment.reference,
            insurerName: data.payment.insurerName,
            recordedBy: authUserId,
            recordedByName: recorderName,
          },
        }),
        prisma.invoice.update({
          where: { id: invoice.id },
          data: { paidAmount: total, status: 'PAID', paidAt: new Date() },
        }),
      ])
    }

    return reply.status(201).send({ data: invoice })
  })

  // POST /api/billing/invoices/:id/payment-link — create Stripe link and send via WhatsApp
  server.post('/invoices/:id/payment-link', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId } = request.authUser

    const invoice = await prisma.invoice.findFirst({
      where: { id, clinicId },
      include: {
        patient: { select: { phone: true, firstName: true, email: true } },
      },
    })
    if (!invoice) return Errors.NOT_FOUND(reply, 'Invoice')

    const remainingAmount = Number(invoice.total) - Number(invoice.paidAmount)
    if (remainingAmount <= 0) {
      return Errors.VALIDATION(reply, { message: 'Invoice already fully paid' })
    }

    const { url, id: linkId } = await createStripePaymentLink({
      amount: Math.round(remainingAmount * 100), // Stripe uses cents
      currency: invoice.currency.toLowerCase(),
      description: `Consulta médica — Factura ${invoice.invoiceNumber}`,
      metadata: { invoiceId: id, clinicId },
      customerEmail: invoice.patient.email ?? undefined,
    })

    // Single update: merge both fields into one DB round-trip
    await prisma.invoice.update({
      where: { id },
      data: {
        stripePaymentLinkId: linkId,
        stripePaymentLinkUrl: url,
        ...(invoice.patient.phone ? { paymentLinkSentAt: new Date() } : {}),
      },
    })

    // Send payment link via WhatsApp — fire-and-forget (don't block the response)
    if (invoice.patient.phone) {
      sendWhatsAppMessage(invoice.patient.phone, {
        type: 'payment_link',
        patientName: invoice.patient.firstName,
        invoiceNumber: invoice.invoiceNumber,
        amount: remainingAmount,
        currency: invoice.currency,
        paymentUrl: url,
      }).catch(console.error)
    }

    return reply.send({ data: { url, linkId } })
  })

  // POST /api/billing/invoices/:id/payments — record a payment
  server.post('/invoices/:id/payments', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId } = request.authUser

    const parsed = RecordPaymentSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    // Parallelize: invoice lookup + editor doctor lookup
    const [invoice, editorDoc] = await Promise.all([
      prisma.invoice.findFirst({ where: { id, clinicId } }),
      prisma.doctor.findFirst({
        where: { authUserId, clinicId },
        select: { firstName: true, lastName: true },
      }),
    ])
    if (!invoice) return Errors.NOT_FOUND(reply, 'Invoice')

    const data = parsed.data
    const recorderName = editorDoc ? `${editorDoc.firstName} ${editorDoc.lastName}` : authUserId

    const payment = await prisma.paymentRecord.create({
      data: {
        invoiceId: id,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
        insurerName: data.insurerName,
        recordedBy: authUserId,
        recordedByName: recorderName,
      },
    })

    // Update invoice paid amount and status
    const newPaidAmount = Number(invoice.paidAmount) + data.amount
    const newStatus = newPaidAmount >= Number(invoice.total)
      ? 'PAID'
      : newPaidAmount > 0 ? 'PARTIALLY_PAID' : invoice.status

    await prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        ...(newStatus === 'PAID' ? { paidAt: new Date() } : {}),
      },
    })

    return reply.status(201).send({ data: payment })
  })

  // GET /api/billing/dashboard — revenue stats
  server.get('/dashboard', { preHandler: requireStaff }, async (request, reply) => {
    const { clinicId, role, doctorId: authDoctorId } = request.authUser
    const query = request.query as {
      from?: string; to?: string
      todayUtc?: string     // client local midnight expressed as UTC ISO (timezone-correct)
      chartFromUtc?: string // client local (today - 6 days) midnight as UTC ISO
      doctorId?: string     // ADMIN/STAFF can filter by doctor; DOCTOR always auto-filtered
    }

    const from = query.from ? new Date(query.from) : (() => {
      const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
    })()
    const to = query.to ? new Date(query.to) : new Date()

    // Use client-provided UTC boundaries so chart and "today" respect client timezone
    const todayStart = query.todayUtc ? new Date(query.todayUtc) : (() => {
      const d = new Date(); d.setHours(0, 0, 0, 0); return d
    })()
    const chart7Start = query.chartFromUtc ? new Date(query.chartFromUtc) : (() => {
      const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d
    })()

    // Determine effective doctorId filter:
    // - DOCTOR → always their own
    // - ADMIN / STAFF → use query param if provided, else global view
    const effectiveDoctorId =
      role === 'DOCTOR' ? authDoctorId :
      query.doctorId ? query.doctorId : undefined

    // Build doctor filter — uses doctorId directly on Invoice (no join, no null exclusions)
    const doctorFilter = effectiveDoctorId ? { doctorId: effectiveDoctorId } : {}

    const invoiceBase = { clinicId, ...doctorFilter }
    const paymentBase = { invoice: invoiceBase }

    const [invoices, payments, payments7d, paymentsToday] = await Promise.all([
      prisma.invoice.findMany({
        where: { ...invoiceBase, issuedAt: { gte: from, lte: to } },
        select: { total: true, paidAmount: true, status: true },
      }),
      prisma.paymentRecord.findMany({
        where: { ...paymentBase, paidAt: { gte: from, lte: to } },
        select: { amount: true, method: true },
      }),
      // Raw payments for last 7 days — frontend groups by local date
      prisma.paymentRecord.findMany({
        where: { ...paymentBase, paidAt: { gte: chart7Start } },
        select: { amount: true, paidAt: true },
      }),
      prisma.paymentRecord.findMany({
        where: { ...paymentBase, paidAt: { gte: todayStart } },
        select: { amount: true },
      }),
    ])

    const totalBilled    = invoices.reduce((s, i) => s + Number(i.total), 0)
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0)
    const pendingAmount  = invoices
      .filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
      .reduce((s, i) => s + (Number(i.total) - Number(i.paidAmount)), 0)
    const overdueAmount  = invoices
      .filter(i => i.status === 'OVERDUE')
      .reduce((s, i) => s + (Number(i.total) - Number(i.paidAmount)), 0)
    const revenueToday   = paymentsToday.reduce((s, p) => s + Number(p.amount), 0)

    // byPaymentMethod as array
    const methodMap = payments.reduce<Record<string, number>>((acc, p) => {
      acc[p.method] = (acc[p.method] ?? 0) + Number(p.amount)
      return acc
    }, {})
    const byPaymentMethod = Object.entries(methodMap).map(([method, amount]) => ({ method, amount }))

    const paidInvoiceCount    = invoices.filter(i => i.status === 'PAID').length
    const pendingInvoiceCount = invoices.filter(i => ['SENT', 'PARTIALLY_PAID'].includes(i.status)).length
    const overdueInvoiceCount = invoices.filter(i => i.status === 'OVERDUE').length

    return reply.send({
      data: {
        totalBilled,
        totalCollected,
        pendingAmount,
        overdueAmount,
        revenueToday,
        invoiceCount: invoices.length,
        paidInvoiceCount,
        pendingInvoiceCount,
        overdueInvoiceCount,
        byPaymentMethod,
        // Raw payments for chart — frontend groups by local date to avoid UTC vs local mismatch
        payments7d: payments7d.map(p => ({ paidAt: p.paidAt.toISOString(), amount: Number(p.amount) })),
        period: { from, to },
      },
    })
  })
}
