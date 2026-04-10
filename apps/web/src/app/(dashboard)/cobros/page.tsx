'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CreditCard, Plus, Link2, DollarSign, TrendingUp, Clock, Loader2, MessageSquare, Building2, Eye } from 'lucide-react'
import type { Invoice } from 'medclinic-shared'
import { INVOICE_STATUS_LABELS } from 'medclinic-shared'
import { cn } from '@/lib/utils'
import { NewInvoiceDialog } from '@/components/billing/new-invoice-dialog'
import { RecordPaymentDialog } from '@/components/billing/record-payment-dialog'
import { InvoiceDetailDialog } from '@/components/billing/invoice-detail-dialog'

interface InvoicesResponse { data: Invoice[]; pagination: { total: number } }
interface DashboardData {
  data: {
    totalBilled: number
    totalCollected: number
    pendingAmount: number
    overdueAmount: number
    revenueToday: number
    invoiceCount: number
    byPaymentMethod?: { method: string; amount: number }[]
    payments7d?: { paidAt: string; amount: number }[]
    currency?: string
  }
}

type ViewMode = 'dia' | 'semana' | 'mes'

const STATUS_CLASSES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
  REFUNDED: 'bg-purple-100 text-purple-700',
}

// Responsive bar chart — uses flexbox so it always fills the container
interface ChartBar { key: string; amount: number; label: string }

function RevenueChart({ bars }: { bars: ChartBar[] }) {
  if (!bars || bars.length === 0) {
    return <div className="flex items-center justify-center h-24 text-xs text-gray-400">Sin datos en este período</div>
  }
  const max = Math.max(...bars.map(b => b.amount), 1)
  // Show labels every N bars so they don't overlap when many bars
  const labelEvery = bars.length > 20 ? 5 : bars.length > 10 ? 3 : 1

  return (
    <div className="w-full select-none">
      {/* Bars */}
      <div className="flex items-end gap-[3px] h-20 w-full">
        {bars.map((b) => {
          const pct = b.amount > 0 ? Math.max((b.amount / max) * 100, 6) : 2
          return (
            <div
              key={b.key}
              className="flex-1 rounded-t transition-all cursor-default"
              style={{
                height: `${pct}%`,
                backgroundColor: b.amount > 0 ? '#3B82F6' : '#DBEAFE',
                opacity: b.amount > 0 ? 0.85 : 1,
              }}
              title={b.amount > 0 ? formatCurrency(b.amount) : undefined}
            />
          )
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-[3px] mt-1.5">
        {bars.map((b, i) => (
          <div key={b.key} className="flex-1 text-center overflow-hidden" style={{ fontSize: '8px', color: '#9CA3AF' }}>
            {i % labelEvery === 0 ? b.label : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

// Payment method breakdown pill
function PaymentMethodBar({ methods }: { methods: { method: string; amount: number }[] }) {
  const total = methods.reduce((s, m) => s + m.amount, 0)
  if (total === 0) return null
  const COLORS: Record<string, string> = {
    CARD: 'bg-blue-500', TRANSFER: 'bg-green-500', CASH: 'bg-yellow-500',
    STRIPE_LINK: 'bg-purple-500', INSURANCE: 'bg-teal-500',
  }
  const LABELS: Record<string, string> = {
    CARD: 'Tarjeta', TRANSFER: 'Transferencia', CASH: 'Efectivo',
    STRIPE_LINK: 'Liga de pago', INSURANCE: 'Seguro',
  }
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-2 mb-2">
        {methods.map((m) => (
          <div key={m.method}
            className={COLORS[m.method] ?? 'bg-gray-400'}
            style={{ width: `${(m.amount / total) * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {methods.map((m) => (
          <div key={m.method} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', COLORS[m.method] ?? 'bg-gray-400')} />
            <span className="text-xs text-gray-600">{LABELS[m.method] ?? m.method}</span>
            <span className="text-xs font-semibold text-gray-800">{formatCurrency(m.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const FILTERS = [
  { value: 'ALL', label: 'Todas' },
  { value: 'SENT', label: 'Enviadas' },
  { value: 'PARTIALLY_PAID', label: 'Pago parcial' },
  { value: 'PAID', label: 'Pagadas' },
  { value: 'OVERDUE', label: 'Vencidas' },
]

export default function CobrosPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<DashboardData['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState<ViewMode>('mes')
  const [showNew, setShowNew] = useState(false)
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null)
  const [detailInvoiceId, setDetailInvoiceId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const todayLocal = new Date(); todayLocal.setHours(0, 0, 0, 0)
      const todayUtc = todayLocal.toISOString()

      // Compute "from" boundary based on selected view mode
      let fromLocal: Date
      if (viewMode === 'dia') {
        fromLocal = new Date(todayLocal) // today midnight
      } else if (viewMode === 'semana') {
        fromLocal = new Date(todayLocal); fromLocal.setDate(todayLocal.getDate() - 6)
      } else {
        fromLocal = new Date(todayLocal); fromLocal.setDate(1) // start of current month
      }

      const params: Record<string, string> = { limit: '50' }
      if (filter !== 'ALL') params['status'] = filter
      const [ivRes, dashRes] = await Promise.all([
        api.billing.invoices(params) as Promise<InvoicesResponse>,
        api.billing.dashboard({
          from: fromLocal.toISOString(),
          todayUtc,
          chartFromUtc: fromLocal.toISOString(),
        }) as Promise<DashboardData>,
      ])
      setInvoices(ivRes.data)
      setStats(dashRes.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [filter, viewMode])

  // Build chart bars in local timezone — granularity depends on viewMode
  const chartBars = useMemo((): ChartBar[] => {
    const todayLocal = new Date(); todayLocal.setHours(0, 0, 0, 0)
    const payments = stats?.payments7d ?? []
    const todayStr = todayLocal.toLocaleDateString('sv-SE')

    if (viewMode === 'dia') {
      // Hourly slots 6am–9pm
      const SLOTS = [6, 8, 10, 12, 14, 16, 18, 20] as const
      const slotMap: Record<number, number> = {}
      for (const h of SLOTS) slotMap[h] = 0
      for (const p of payments) {
        if (new Date(p.paidAt).toLocaleDateString('sv-SE') !== todayStr) continue
        const hour = new Date(p.paidAt).getHours()
        const slot = [...SLOTS].reverse().find(s => hour >= s) ?? SLOTS[0]
        slotMap[slot] = (slotMap[slot] ?? 0) + p.amount
      }
      return SLOTS.map(h => ({
        key: String(h),
        amount: slotMap[h] ?? 0,
        label: `${h}h`,
      }))
    }

    if (viewMode === 'semana') {
      const dayMap: Record<string, number> = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date(todayLocal); d.setDate(d.getDate() - 6 + i)
        dayMap[d.toLocaleDateString('sv-SE')] = 0
      }
      for (const p of payments) {
        const key = new Date(p.paidAt).toLocaleDateString('sv-SE')
        if (key in dayMap) dayMap[key] = (dayMap[key] ?? 0) + p.amount
      }
      return Object.entries(dayMap).map(([date, amount]) => ({
        key: date,
        amount,
        label: `${date.split('-')[2]} ${new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', { month: 'short' })}`,
      }))
    }

    // mes: all days of current month up to today
    const daysElapsed = todayLocal.getDate()
    const monthStart = new Date(todayLocal); monthStart.setDate(1)
    const dayMap: Record<string, number> = {}
    for (let i = 0; i < daysElapsed; i++) {
      const d = new Date(monthStart); d.setDate(i + 1)
      dayMap[d.toLocaleDateString('sv-SE')] = 0
    }
    for (const p of payments) {
      const key = new Date(p.paidAt).toLocaleDateString('sv-SE')
      if (key in dayMap) dayMap[key] = (dayMap[key] ?? 0) + p.amount
    }
    return Object.entries(dayMap).map(([date, amount]) => ({
      key: date,
      amount,
      label: date.split('-')[2] ?? '',
    }))
  }, [stats, viewMode])

  useEffect(() => { load() }, [load])

  async function handleSendPaymentLink(invoice: Invoice) {
    setActionLoading((a) => ({ ...a, [invoice.id]: 'link' }))
    try {
      const res = await api.billing.createPaymentLink(invoice.id) as { data: { url: string } }
      await load()
      alert(`Liga enviada por WhatsApp: ${res.data.url}`)
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
    finally { setActionLoading((a) => ({ ...a, [invoice.id]: '' })) }
  }

  const paymentMethods = stats?.byPaymentMethod ?? []

  return (
    <>
      <Header
        title="Cobros y facturación"
        subtitle="Ingresos, pagos y estado de cuenta"
        actions={
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus className="w-4 h-4" /> Nueva factura
          </button>
        }
      />

      <div className="flex-1 p-6 overflow-auto space-y-6">
        {/* View mode */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start w-fit">
          {(['dia', 'semana', 'mes'] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setViewMode(m)}
              className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                viewMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {m === 'dia' ? 'Día' : m === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: viewMode === 'dia' ? 'Ingresos hoy' : viewMode === 'semana' ? 'Ingresos semana' : 'Ingresos del mes', value: formatCurrency(stats?.totalBilled ?? 0), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Cobrado', value: formatCurrency(stats?.totalCollected ?? 0), sub: `${invoices.filter(i => i.status === 'PAID').length} facturas`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Pendiente', value: formatCurrency(stats?.pendingAmount ?? 0), sub: `${invoices.filter(i => ['SENT','PARTIALLY_PAID'].includes(i.status)).length} facturas`, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Vencido', value: formatCurrency(stats?.overdueAmount ?? 0), sub: `${invoices.filter(i => i.status === 'OVERDUE').length} facturas`, icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-300 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
                  {sub && <p className="text-xs text-gray-400">{sub}</p>}
                </div>
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-300 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {viewMode === 'dia' ? 'Ingresos por hora — hoy' : viewMode === 'semana' ? 'Ingresos últimos 7 días' : 'Ingresos por día — este mes'}
            </h3>
            <RevenueChart bars={chartBars} />
          </div>

          {/* Payment method breakdown */}
          <div className="bg-white rounded-xl border border-gray-300 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Desglose por método de pago</h3>
            <PaymentMethodBar methods={paymentMethods} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === f.value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-400')}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Invoice table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Aseguradora</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Copago</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => {
                  const total = Number(invoice.total)
                  const paid = Number(invoice.paidAmount)
                  const remaining = total - paid
                  const isPending = ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'DRAFT'].includes(invoice.status)
                  // Estimate insurance/copay split (if insuranceCoverage exists on invoice, use it; else show total)
                  const ins = (invoice as any).insuranceCoverage as number | undefined
                  const copay = ins != null ? total - ins : null

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono font-medium text-gray-900">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-400">{formatDate(invoice.issuedAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{invoice.patient?.firstName} {invoice.patient?.lastName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600 max-w-[160px] truncate">
                          {(invoice as any).description ?? 'Consulta'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(total, invoice.currency)}
                        </p>
                        {remaining > 0 && paid > 0 && (
                          <p className="text-xs text-orange-600">Pendiente: {formatCurrency(remaining, invoice.currency)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {ins != null ? (
                          <p className="text-sm text-gray-700">{formatCurrency(ins, invoice.currency)}</p>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {copay != null ? (
                          <p className="text-sm font-medium text-gray-800">{formatCurrency(copay, invoice.currency)}</p>
                        ) : (
                          <p className="text-sm text-gray-700">{formatCurrency(total, invoice.currency)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', STATUS_CLASSES[invoice.status])}>
                          {INVOICE_STATUS_LABELS[invoice.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDetailInvoiceId(invoice.id) }}
                            className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 font-medium">
                            <Eye className="w-3.5 h-3.5" /> Ver
                          </button>
                          {isPending && remaining > 0 && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setPayingInvoice(invoice) }}
                                className="text-xs text-gray-600 border border-gray-300 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 font-medium">
                                Registrar pago
                              </button>
                              {!invoice.stripePaymentLinkUrl ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSendPaymentLink(invoice) }}
                                  disabled={actionLoading[invoice.id] === 'link'}
                                  className="flex items-center gap-1.5 text-xs text-green-700 border border-green-300 px-2.5 py-1.5 rounded-lg hover:bg-green-50 font-medium disabled:opacity-50">
                                  {actionLoading[invoice.id] === 'link'
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <MessageSquare className="w-3 h-3" />}
                                  WhatsApp
                                </button>
                              ) : (
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
        <NewInvoiceDialog onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load() }} />
      )}
      {payingInvoice && (
        <RecordPaymentDialog invoice={payingInvoice} onClose={() => setPayingInvoice(null)} onRecorded={() => { setPayingInvoice(null); load() }} />
      )}
      {detailInvoiceId && (
        <InvoiceDetailDialog invoiceId={detailInvoiceId} onClose={() => setDetailInvoiceId(null)} />
      )}
    </>
  )
}
