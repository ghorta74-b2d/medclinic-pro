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
  payment: z.object({
    method: z.enum(['CASH', 'CARD', 'TRANSFER', 'INSURANCE', 'STRIPE_ONLINE']),
    reference: z.string().optional(),
  }).optional(),
})

const RecordPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'INSURANCE', 'STRIPE_ONLINE']),
  reference: z.string().optional(),
  notes: z.string().optional(),
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
    const { clinicId } = request.authUser
    const query = request.query as {
      patientId?: string
      status?: string
      from?: string
      to?: string
      page?: string
      limit?: string
    }

    const page = parseInt(query.page ?? '1', 10)
    const limit = parseInt(query.limit ?? '20', 10)

    const where: Record<string, unknown> = { clinicId }
    if (query.patientId) where['patientId'] = query.patientId
    if (query.status) where['status'] = query.status
    if (query.from || query.to) {
      where['issuedAt'] = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      }
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

    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, clinicId } })
    if (!patient) return Errors.NOT_FOUND(reply, 'Patient')

    // Generate invoice number: INV-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const count = await prisma.invoice.count({ where: { clinicId } })
    const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(4, '0')}`

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

    const invoice = await prisma.invoice.create({
      data: {
        clinicId,
        patientId: data.patientId,
        appointmentId: data.appointmentId,
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
      await prisma.paymentRecord.create({
        data: {
          invoiceId: invoice.id,
          amount: total,
          currency: 'MXN',
          method: data.payment.method,
          reference: data.payment.reference,
          recordedBy: request.authUser.authUserId,
        },
      })
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: total, status: 'PAID', paidAt: new Date() },
      })
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

    await prisma.invoice.update({
      where: { id },
      data: {
        stripePaymentLinkId: linkId,
        stripePaymentLinkUrl: url,
      },
    })

    // Send payment link via WhatsApp
    if (invoice.patient.phone) {
      await sendWhatsAppMessage(invoice.patient.phone, {
        type: 'payment_link',
        patientName: invoice.patient.firstName,
        invoiceNumber: invoice.invoiceNumber,
        amount: remainingAmount,
        currency: invoice.currency,
        paymentUrl: url,
      })

      await prisma.invoice.update({
        where: { id },
        data: { paymentLinkSentAt: new Date() },
      })
    }

    return reply.send({ data: { url, linkId } })
  })

  // POST /api/billing/invoices/:id/payments — record a payment
  server.post('/invoices/:id/payments', { preHandler: requireStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clinicId, authUserId } = request.authUser

    const parsed = RecordPaymentSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const invoice = await prisma.invoice.findFirst({ where: { id, clinicId } })
    if (!invoice) return Errors.NOT_FOUND(reply, 'Invoice')

    const data = parsed.data

    const payment = await prisma.paymentRecord.create({
      data: {
        invoiceId: id,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
        recordedBy: authUserId,
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
    const { clinicId } = request.authUser
    const query = request.query as { from?: string; to?: string }

    const from = query.from ? new Date(query.from) : (() => {
      const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
    })()
    const to = query.to ? new Date(query.to) : new Date()

    // 7-day window for chart (always last 7 days regardless of filter)
    const chart7Start = new Date(); chart7Start.setDate(chart7Start.getDate() - 6); chart7Start.setHours(0, 0, 0, 0)
    const todayStart  = new Date(); todayStart.setHours(0, 0, 0, 0)

    const [invoices, payments, payments7d, paymentsToday] = await Promise.all([
      prisma.invoice.findMany({
        where: { clinicId, issuedAt: { gte: from, lte: to } },
        select: { total: true, paidAmount: true, status: true },
      }),
      prisma.paymentRecord.findMany({
        where: { invoice: { clinicId }, paidAt: { gte: from, lte: to } },
        select: { amount: true, method: true },
      }),
      prisma.paymentRecord.findMany({
        where: { invoice: { clinicId }, paidAt: { gte: chart7Start } },
        select: { amount: true, paidAt: true },
      }),
      prisma.paymentRecord.findMany({
        where: { invoice: { clinicId }, paidAt: { gte: todayStart } },
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

    // Daily revenue for last 7 days
    const dayMap: Record<string, number> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(chart7Start); d.setDate(d.getDate() + i)
      const key = d.toISOString().split('T')[0]!
      dayMap[key] = 0
    }
    for (const p of payments7d) {
      const key = new Date(p.paidAt).toISOString().split('T')[0]!
      if (key in dayMap) dayMap[key] = (dayMap[key] ?? 0) + Number(p.amount)
    }
    const revenueChart = Object.entries(dayMap).map(([date, amount]) => ({ date, amount }))

    return reply.send({
      data: {
        totalBilled,
        totalCollected,
        pendingAmount,
        overdueAmount,
        revenueToday,
        invoiceCount: invoices.length,
        byPaymentMethod,
        revenueChart,
        period: { from, to },
      },
    })
  })
}
