'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { api, getUserRole, getOwnDoctorId, sessionCache, readCache, writeCache } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CreditCard, Plus, DollarSign, TrendingUp, Clock, Loader2, MessageSquare, Building2, Eye, ChevronDown } from 'lucide-react'
import type { Invoice } from 'medclinic-shared'
import { INVOICE_STATUS_LABELS } from 'medclinic-shared'
import { cn } from '@/lib/utils'
import { NewInvoiceDialog } from '@/components/billing/new-invoice-dialog'
import { RecordPaymentDialog } from '@/components/billing/record-payment-dialog'
import { InvoiceDetailDialog } from '@/components/billing/invoice-detail-dialog'
import { PeriodNavigator, computePeriod, stepAnchor, type Granularity, type Period } from '@/components/ui/period-navigator'
import { EcgLoader } from '@/components/ui/ecg-loader'
import { KpiCard, pctChange } from '@/components/ui/kpi-card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface InvoicesResponse { data: Invoice[]; pagination: { total: number } }
interface DashboardData {
  data: {
    totalBilled: number
    totalCollected: number
    pendingAmount: number
    overdueAmount: number
    revenueToday: number
    invoiceCount: number
    paidInvoiceCount: number
    pendingInvoiceCount: number
    overdueInvoiceCount: number
    byPaymentMethod?: { method: string; amount: number }[]
    byDoctor?: { doctorId: string | null; name: string; amount: number }[]
    totalBilledPrev?: number
    totalCollectedPrev?: number
    hasPrev?: boolean
    payments7d?: { paidAt: string; amount: number }[]
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

interface ChartBar { key: string; amount: number; label: string; full: string }

interface ChartTooltipProps {
  active?: boolean
  payload?: { value?: number; payload?: ChartBar }[]
}

// Tooltip: monto cobrado en grande + fecha/hora completa debajo
function RevenueTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const bar = payload[0]?.payload
  const amount = Number(payload[0]?.value ?? 0)
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-sm font-bold text-foreground">{formatCurrency(amount)}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{bar?.full ?? ''}</p>
    </div>
  )
}

function RevenueChart({ bars }: { bars: ChartBar[] }) {
  if (!bars || bars.length === 0) {
    return <div className="flex items-center justify-center h-40 text-xs text-muted-foreground/60">Sin datos en este período</div>
  }
  return (
    <div className="w-full h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
          />
          <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} content={<RevenueTooltip />} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {bars.map((b) => (
              <Cell key={b.key} fill="hsl(var(--primary))" fillOpacity={b.amount > 0 ? 0.85 : 0.2} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Payment method breakdown pill
function PaymentMethodBar({ methods }: { methods: { method: string; amount: number }[] }) {
  const total = methods.reduce((s, m) => s + m.amount, 0)
  if (total === 0) return <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/60">Sin pagos en este período</div>
  const COLORS: Record<string, string> = {
    CARD: 'bg-primary', TRANSFER: 'bg-success', CASH: 'bg-warning',
    STRIPE_LINK: 'bg-primary', INSURANCE: 'bg-success',
  }
  const LABELS: Record<string, string> = {
    CARD: 'Tarjeta', TRANSFER: 'Transferencia', CASH: 'Efectivo',
    STRIPE_LINK: 'Liga de pago', INSURANCE: 'Seguro', STRIPE_ONLINE: 'Liga de pago',
  }
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-2 mb-2">
        {methods.map((m) => (
          <div key={m.method}
            className={COLORS[m.method] ?? 'bg-muted-foreground'}
            style={{ width: `${(m.amount / total) * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {methods.map((m) => (
          <div key={m.method} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', COLORS[m.method] ?? 'bg-muted-foreground')} />
            <span className="text-xs text-muted-foreground">{LABELS[m.method] ?? m.method}</span>
            <span className="text-xs font-semibold text-foreground">{formatCurrency(m.amount)}</span>
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

interface Doctor { id: string; firstName: string; lastName: string }

export default function CobrosPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<DashboardData['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [granularity, setGranularity] = useState<Granularity>('mes')
  const [anchor, setAnchor] = useState<Date>(() => new Date())
  const [showNew, setShowNew] = useState(false)
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null)
  const [detailInvoiceId, setDetailInvoiceId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({})

  // Role state — NEVER bootstrapped from sessionStorage.
  // Always verified from JWT on mount to prevent stale data when users
  // switch accounts in the same browser without clearing sessionStorage.
  const [userRole, setUserRole] = useState<string | null>(null)
  const [ownDoctorId, setOwnDoctorId] = useState<string | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('ALL')
  const [roleReady, setRoleReady] = useState(false)

  const period = useMemo(() => computePeriod(granularity, anchor), [granularity, anchor])

  useEffect(() => {
    async function init() {
      try {
        const role = await getUserRole()
        if (!role) return

        // If cached role differs from JWT → user switched accounts → clear stale data
        const cachedRole = sessionCache.getRole()
        if (cachedRole && cachedRole !== role) sessionCache.clear()

        sessionCache.setRole(role)
        setUserRole(role)

        if (role === 'DOCTOR') {
          const myId = await getOwnDoctorId()
          if (myId) { sessionCache.setDoctorId(myId); setOwnDoctorId(myId) }
        } else {
          // ADMIN / STAFF: global clinic view, load doctor list for filter
          sessionCache.clearDoctorId()
          const res = await api.configuracion.doctors() as { data: Doctor[] }
          setDoctors(res.data ?? [])
        }
      } catch {}
      finally { setRoleReady(true) }
    }
    init()
  }, [])

  // Fetch (and cache) invoices + stats for a given period.
  // `silent` mode only warms the cache without touching component state —
  // used to prefetch the previous period so navigating back feels instant.
  const fetchPeriod = useCallback(async (p: Period, opts: { silent?: boolean } = {}) => {
    const { silent } = opts
    const todayLocal = new Date(); todayLocal.setHours(0, 0, 0, 0)
    const todayUtc = todayLocal.toISOString()
    const effectiveDoctor =
      userRole === 'DOCTOR' ? ownDoctorId :
      selectedDoctorId !== 'ALL' ? selectedDoctorId : undefined

    const anchorKey = p.from.toLocaleDateString('sv-SE')
    const cacheKey = `_cobros_${effectiveDoctor ?? 'all'}_${granularity}_${anchorKey}_${filter}`

    if (silent) {
      // Don't re-fetch if the period is already warm in cache
      if (readCache(cacheKey)) return
    } else {
      // Stale-while-revalidate: show cached invoices + stats instantly
      const cached = readCache<{ invoices: Invoice[]; stats: DashboardData['data'] }>(cacheKey)
      if (cached) {
        setInvoices(cached.invoices)
        setStats(cached.stats)
        setLoading(false)
      } else {
        setLoading(true)
      }
    }

    try {
      const ivParams: Record<string, string> = {
        limit: '200',
        from: p.from.toISOString(),
        to: p.to.toISOString(),
      }
      if (filter !== 'ALL') ivParams['status'] = filter
      if (effectiveDoctor) ivParams['doctorId'] = effectiveDoctor

      const dashParams: Record<string, string> = {
        from: p.from.toISOString(),
        to: p.to.toISOString(),
        prevFrom: p.prevFrom.toISOString(),
        prevTo: p.prevTo.toISOString(),
        todayUtc,
        chartFromUtc: p.from.toISOString(),
        chartToUtc: p.to.toISOString(),
      }
      if (effectiveDoctor) dashParams['doctorId'] = effectiveDoctor

      const [ivRes, dashRes] = await Promise.all([
        api.billing.invoices(ivParams) as Promise<InvoicesResponse>,
        api.billing.dashboard(dashParams) as Promise<DashboardData>,
      ])
      if (!silent) {
        setInvoices(ivRes.data)
        setStats(dashRes.data)
      }
      writeCache(cacheKey, { invoices: ivRes.data, stats: dashRes.data })
    } catch (err) { if (!silent) console.error(err) }
    finally { if (!silent) setLoading(false) }
  }, [filter, granularity, userRole, ownDoctorId, selectedDoctorId])

  const load = useCallback(() => {
    if (!roleReady) return
    fetchPeriod(period)
  }, [fetchPeriod, period, roleReady])

  // Build chart bars in local timezone — granularity decides the buckets
  const chartBars = useMemo((): ChartBar[] => {
    const payments = stats?.payments7d ?? []
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

    if (granularity === 'dia') {
      const dayStr = period.from.toLocaleDateString('sv-SE')
      const SLOTS = [6, 8, 10, 12, 14, 16, 18, 20] as const
      const slotMap: Record<number, number> = {}
      for (const h of SLOTS) slotMap[h] = 0
      for (const p of payments) {
        const d = new Date(p.paidAt)
        if (d.toLocaleDateString('sv-SE') !== dayStr) continue
        const hour = d.getHours()
        const slot = [...SLOTS].reverse().find(s => hour >= s) ?? SLOTS[0]
        slotMap[slot] = (slotMap[slot] ?? 0) + p.amount
      }
      return SLOTS.map(h => ({ key: String(h), amount: slotMap[h] ?? 0, label: `${h}h`, full: `${h}:00 h` }))
    }

    // semana / mes: one bar per day from period.from to min(period.to, today)
    const dayMap: Record<string, number> = {}
    const last = period.to.getTime() < todayEnd.getTime() ? period.to : todayEnd
    const cursor = new Date(period.from)
    while (cursor.getTime() <= last.getTime()) {
      dayMap[cursor.toLocaleDateString('sv-SE')] = 0
      cursor.setDate(cursor.getDate() + 1)
    }
    for (const p of payments) {
      const key = new Date(p.paidAt).toLocaleDateString('sv-SE')
      if (key in dayMap) dayMap[key] = (dayMap[key] ?? 0) + p.amount
    }
    return Object.entries(dayMap).map(([date, amount]) => {
      const d = new Date(`${date}T12:00:00`)
      return {
        key: date,
        amount,
        label: granularity === 'semana'
          ? `${date.split('-')[2]} ${d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}`
          : date.split('-')[2] ?? '',
        full: d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', ''),
      }
    })
  }, [stats, granularity, period])

  useEffect(() => { load() }, [load])

  // Prefetch the previous period in the background so clicking ‹ is instant
  useEffect(() => {
    if (!roleReady) return
    const t = setTimeout(() => {
      fetchPeriod(computePeriod(granularity, stepAnchor(granularity, anchor, -1)), { silent: true })
    }, 500)
    return () => clearTimeout(t)
  }, [fetchPeriod, granularity, anchor, roleReady])

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
  const ingresosLabel = granularity === 'dia' ? 'Ingresos del día' : granularity === 'semana' ? 'Ingresos de la semana' : 'Ingresos del mes'
  const chartTitle = granularity === 'dia' ? 'Ingresos por hora' : granularity === 'semana' ? 'Ingresos por día — semana' : 'Ingresos por día — mes'

  return (
    <>
      <Header
        title="Cobros y facturación"
        subtitle="Ingresos, pagos y estado de cuenta"
        actions={
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus className="w-4 h-4" /> Nueva factura
          </button>
        }
      />

      <div className="flex-1 p-3 sm:p-6 overflow-auto space-y-4 sm:space-y-6">
        {/* Controls row: period navigator + doctor filter */}
        <div className="flex items-center gap-3 flex-wrap justify-between">
          <PeriodNavigator
            granularity={granularity}
            anchor={anchor}
            onChange={(g, a) => { setGranularity(g); setAnchor(a) }}
          />

          {/* Doctor filter — only visible for ADMIN and STAFF */}
          {userRole && userRole !== 'DOCTOR' && doctors.length > 0 && (
            <div className="relative">
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="appearance-none bg-card border border-border rounded-lg px-3 py-1.5 pr-8 text-sm text-foreground/80 font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer">
                <option value="ALL">Clínica completa</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          )}

          {/* Context badge — DOCTOR sees their own label */}
          {userRole === 'DOCTOR' && (
            <span className="text-xs font-medium text-primary bg-primary/10 border border-primary px-2.5 py-1 rounded-full">
              Mis ingresos
            </span>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label={ingresosLabel}
            value={formatCurrency(stats?.totalBilled ?? 0)}
            icon={TrendingUp} color="text-primary" bg="bg-primary/10"
            delta={stats?.hasPrev ? pctChange(stats?.totalBilled ?? 0, stats?.totalBilledPrev ?? 0) : null}
          />
          <KpiCard
            label="Cobrado"
            value={formatCurrency(stats?.totalCollected ?? 0)}
            sub={`${stats?.paidInvoiceCount ?? 0} facturas`}
            icon={DollarSign} color="text-success" bg="bg-success/10"
            delta={stats?.hasPrev ? pctChange(stats?.totalCollected ?? 0, stats?.totalCollectedPrev ?? 0) : null}
          />
          <KpiCard
            label="Pendiente"
            value={formatCurrency(stats?.pendingAmount ?? 0)}
            sub={`${stats?.pendingInvoiceCount ?? 0} facturas`}
            icon={Clock} color="text-warning" bg="bg-warning/10"
          />
          <KpiCard
            label="Vencido"
            value={formatCurrency(stats?.overdueAmount ?? 0)}
            sub={`${stats?.overdueInvoiceCount ?? 0} facturas`}
            icon={CreditCard} color="text-destructive" bg="bg-destructive/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue chart */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">{chartTitle}</h3>
            <RevenueChart bars={chartBars} />
          </div>

          {/* Payment method breakdown */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Desglose por método de pago</h3>
            <PaymentMethodBar methods={paymentMethods} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === f.value ? 'bg-primary text-white' : 'bg-card border border-border text-muted-foreground hover:border-primary')}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Invoice table */}
        {loading ? (
          <div className="py-12"><EcgLoader label="Cargando facturas…" /></div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">No hay facturas en este período</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Factura</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Paciente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Concepto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Aseguradora</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {invoices.map((invoice) => {
                  const total = Number(invoice.total)
                  const paid = Number(invoice.paidAmount)
                  const remaining = total - paid
                  const isPending = ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'DRAFT'].includes(invoice.status)

                  return (
                    <tr key={invoice.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono font-medium text-foreground">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(invoice.issuedAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{invoice.patient?.firstName} {invoice.patient?.lastName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-muted-foreground max-w-[180px] truncate">
                          {(invoice as any).items?.[0]?.description ?? '—'}
                          {(invoice as any).items?.length > 1 && (
                            <span className="text-xs text-muted-foreground ml-1">+{(invoice as any).items.length - 1}</span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(total, invoice.currency)}
                        </p>
                        {remaining > 0 && paid > 0 && (
                          <p className="text-xs text-warning">Pendiente: {formatCurrency(remaining, invoice.currency)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(invoice as any).payments?.[0]?.insurerName ? (
                          <p className="text-sm text-foreground/80">{(invoice as any).payments[0].insurerName}</p>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
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
                            className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border px-2.5 py-1.5 rounded-lg hover:bg-muted/50 font-medium">
                            <Eye className="w-3.5 h-3.5" /> Ver
                          </button>
                          {isPending && remaining > 0 && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setPayingInvoice(invoice) }}
                                className="text-xs text-muted-foreground border border-border px-2.5 py-1.5 rounded-lg hover:bg-muted/50 font-medium">
                                Registrar pago
                              </button>
                              {!invoice.stripePaymentLinkUrl ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSendPaymentLink(invoice) }}
                                  disabled={actionLoading[invoice.id] === 'link'}
                                  className="flex items-center gap-1.5 text-xs text-success border border-success/50 px-2.5 py-1.5 rounded-lg hover:bg-success/10 font-medium disabled:opacity-50">
                                  {actionLoading[invoice.id] === 'link'
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <MessageSquare className="w-3 h-3" />}
                                  WhatsApp
                                </button>
                              ) : (
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
