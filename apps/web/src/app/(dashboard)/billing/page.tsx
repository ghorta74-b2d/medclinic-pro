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
  DRAFT: 'bg-muted text-muted-foreground',
  SENT: 'bg-primary/15 text-primary',
  PAID: 'bg-success/15 text-success',
  PARTIALLY_PAID: 'bg-warning/15 text-warning',
  OVERDUE: 'bg-destructive/15 text-destructive',
  CANCELLED: 'bg-muted text-muted-foreground/60',
  REFUNDED: 'bg-primary/15 text-primary',
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
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Nueva factura
          </button>
        }
      />

      <div className="flex-1 p-3 sm:p-6 overflow-auto">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Facturado (mes)', value: formatCurrency(stats.totalBilled), icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Cobrado (mes)', value: formatCurrency(stats.totalCollected), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
              { label: 'Por cobrar', value: formatCurrency(stats.pendingAmount), icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'Facturas (mes)', value: String(stats.invoiceCount), icon: CreditCard, color: 'text-primary', bg: 'bg-primary/10' },
            ].map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
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
                filter === f.value ? 'bg-primary text-white' : 'bg-card border border-border text-muted-foreground hover:border-primary')}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">No hay facturas</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Factura</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Paciente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Pagado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {invoices.map((invoice) => {
                  const remaining = Number(invoice.total) - Number(invoice.paidAmount)
                  const isPending = ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'DRAFT'].includes(invoice.status)

                  return (
                    <tr key={invoice.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono font-medium text-foreground">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(invoice.issuedAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">
                          {invoice.patient?.firstName} {invoice.patient?.lastName}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(Number(invoice.total), invoice.currency)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground/80">
                          {formatCurrency(Number(invoice.paidAmount), invoice.currency)}
                        </p>
                        {remaining > 0 && (
                          <p className="text-xs text-warning">
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
                                className="text-xs text-muted-foreground border border-border px-2.5 py-1.5 rounded-lg hover:bg-muted/50 font-medium"
                              >
                                Registrar pago
                              </button>
                              {!invoice.stripePaymentLinkUrl && (
                                <button
                                  onClick={() => handleSendPaymentLink(invoice)}
                                  disabled={actionLoading[invoice.id] === 'link'}
                                  className="flex items-center gap-1.5 text-xs text-success border border-success/50 px-2.5 py-1.5 rounded-lg hover:bg-success/10 font-medium disabled:opacity-50"
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
                                   className="text-xs text-primary hover:underline border border-primary px-2.5 py-1.5 rounded-lg">
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
