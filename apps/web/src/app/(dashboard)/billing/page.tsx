'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate, formatCurrency, formatRelative } from '@/lib/utils'
import { CreditCard, Plus, Link2, DollarSign, TrendingUp, Clock, Loader2 } from 'lucide-react'
import type { Invoice } from 'medclinic-shared'
import { INVOICE_STATUS_LABELS } from 'medclinic-shared'
import { cn } from '@/lib/utils'
import { NewInvoiceDialog } from '@/components/billing/new-invoice-dialog'
import { RecordPaymentDialog } from '@/components/billing/record-payment-dialog'

interface InvoicesResponse { data: Invoice[]; pagination: { total: number } }
interface DashboardData {
  data: {
    totalBilled: number
    totalCollected: number
    pendingAmount: number
    invoiceCount: number
    currency?: string
  }
}

const STATUS_CLASSES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
  REFUNDED: 'bg-purple-100 text-purple-700',
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<DashboardData['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [showNew, setShowNew] = useState(false)
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { limit: '50' }
      if (filter !== 'ALL') params['status'] = filter
      const [ivRes, dashRes] = await Promise.all([
        api.billing.invoices(params) as Promise<InvoicesResponse>,
        api.billing.dashboard() as Promise<DashboardData>,
      ])
      setInvoices(ivRes.data)
      setStats(dashRes.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function handleSendPaymentLink(invoice: Invoice) {
    setActionLoading((a) => ({ ...a, [invoice.id]: 'link' }))
    try {
      const res = await api.billing.createPaymentLink(invoice.id) as { data: { url: string } }
      await load()
      alert(`Liga de pago creada y enviada por WhatsApp: ${res.data.url}`)
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
    finally { setActionLoading((a) => ({ ...a, [invoice.id]: '' })) }
  }

  const FILTERS = [
    { value: 'ALL', label: 'Todas' },
    { value: 'SENT', label: 'Enviadas' },
    { value: 'PARTIALLY_PAID', label: 'Pago parcial' },
    { value: 'PAID', label: 'Pagadas' },
    { value: 'OVERDUE', label: 'Vencidas' },
  ]

  return (
    <>
      <Header
        title="Facturación"
        subtitle="Cobros, pagos y estado de cuenta"
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Nueva factura
          </button>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Facturado (mes)', value: formatCurrency(stats.totalBilled), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Cobrado (mes)', value: formatCurrency(stats.totalCollected), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Por cobrar', value: formatCurrency(stats.pendingAmount), icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Facturas (mes)', value: String(stats.invoiceCount), icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="bg-white rounded-xl border border-gray-300 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === f.value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-400')}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">No hay facturas</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Factura</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Paciente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pagado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => {
                  const remaining = Number(invoice.total) - Number(invoice.paidAmount)
                  const isPending = ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'DRAFT'].includes(invoice.status)

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono font-medium text-gray-900">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-400">{formatDate(invoice.issuedAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">
                          {invoice.patient?.firstName} {invoice.patient?.lastName}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(invoice.total), invoice.currency)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">
                          {formatCurrency(Number(invoice.paidAmount), invoice.currency)}
                        </p>
                        {remaining > 0 && (
                          <p className="text-xs text-orange-600">
                            Pendiente: {formatCurrency(remaining, invoice.currency)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', STATUS_CLASSES[invoice.status])}>
                          {INVOICE_STATUS_LABELS[invoice.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {isPending && remaining > 0 && (
                            <>
                              <button
                                onClick={() => setPayingInvoice(invoice)}
                                className="text-xs text-gray-600 border border-gray-300 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 font-medium"
                              >
                                Registrar pago
                              </button>
                              {!invoice.stripePaymentLinkUrl && (
                                <button
                                  onClick={() => handleSendPaymentLink(invoice)}
                                  disabled={actionLoading[invoice.id] === 'link'}
                                  className="flex items-center gap-1.5 text-xs text-green-700 border border-green-300 px-2.5 py-1.5 rounded-lg hover:bg-green-50 font-medium disabled:opacity-50"
                                >
                                  {actionLoading[invoice.id] === 'link'
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Link2 className="w-3 h-3" />
                                  }
                                  Liga WA
                                </button>
                              )}
                              {invoice.stripePaymentLinkUrl && (
                                <a href={invoice.stripePaymentLinkUrl} target="_blank" rel="noopener noreferrer"
                                   className="text-xs text-blue-600 hover:underline border border-blue-200 px-2.5 py-1.5 rounded-lg">
                                  Ver liga
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewInvoiceDialog
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load() }}
        />
      )}

      {payingInvoice && (
        <RecordPaymentDialog
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onRecorded={() => { setPayingInvoice(null); load() }}
        />
      )}
    </>
  )
}
