'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { X, Loader2, CreditCard, Banknote, ArrowLeftRight, Building2, UserCheck } from 'lucide-react'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { INVOICE_STATUS_LABELS } from 'medclinic-shared'

interface InvoiceDetailDialogProps {
  invoiceId: string
  onClose: () => void
}

const STATUS_CLASSES: Record<string, string> = {
  DRAFT:          'bg-muted text-muted-foreground',
  SENT:           'bg-primary/15 text-primary',
  PAID:           'bg-success/15 text-success',
  PARTIALLY_PAID: 'bg-warning/15 text-warning',
  OVERDUE:        'bg-destructive/15 text-destructive',
  CANCELLED:      'bg-muted text-muted-foreground',
  REFUNDED:       'bg-primary/15 text-primary',
}

const METHOD_LABELS: Record<string, string> = {
  CASH:          'Efectivo',
  CARD:          'Tarjeta',
  TRANSFER:      'SPEI / Transferencia',
  INSURANCE:     'Seguro',
  STRIPE_ONLINE: 'Pago en línea',
}

function MethodIcon({ method }: { method: string }) {
  const cls = 'w-4 h-4 text-success'
  if (method === 'CASH')     return <Banknote className={cls} />
  if (method === 'TRANSFER') return <ArrowLeftRight className={cls} />
  if (method === 'INSURANCE') return <Building2 className={cls} />
  return <CreditCard className={cls} />
}

export function InvoiceDetailDialog({ invoiceId, onClose }: InvoiceDetailDialogProps) {
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.billing.getInvoice(invoiceId)
      .then((res: any) => { setInvoice(res?.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [invoiceId])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {invoice ? invoice.invoiceNumber : 'Factura'}
            </h2>
            {invoice && (
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(invoice.issuedAt)}</p>
            )}
            {invoice && invoice.payments?.[0]?.recordedByName && (
              <div className="flex items-center gap-1 mt-1.5">
                <UserCheck className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Registrado por <span className="font-medium text-muted-foreground">{invoice.payments[0].recordedByName}</span>
                  {' · '}{formatDate(invoice.payments[0].paidAt)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {invoice && (
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_CLASSES[invoice.status] ?? '')}>
                {INVOICE_STATUS_LABELS[invoice.status as keyof typeof INVOICE_STATUS_LABELS] ?? invoice.status}
              </span>
            )}
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !invoice ? (
          <div className="text-center py-12 text-sm text-muted-foreground">No se pudo cargar la factura</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Patient */}
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Paciente</p>
              <p className="text-sm font-semibold text-foreground">
                {invoice.patient?.firstName} {invoice.patient?.lastName}
              </p>
              {invoice.patient?.phone && (
                <p className="text-xs text-muted-foreground">{invoice.patient.phone}</p>
              )}
            </div>

            {/* Line items */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Conceptos</p>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-muted-foreground">Descripción</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground">Cant.</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground">Precio</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(invoice.items ?? []).map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="px-3 py-2.5">
                          <p className="text-sm text-foreground">{item.description}</p>
                          {Number(item.taxRate) > 0 && (
                            <p className="text-[10px] text-primary">
                              IVA {(Number(item.taxRate) * 100).toFixed(0)}%
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-sm text-muted-foreground">{Number(item.quantity)}</td>
                        <td className="px-3 py-2.5 text-right text-sm text-muted-foreground">{formatCurrency(Number(item.unitPrice))}</td>
                        <td className="px-3 py-2.5 text-right text-sm font-medium text-foreground">{formatCurrency(Number(item.total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-primary/10 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span><span>{formatCurrency(Number(invoice.subtotal))}</span>
              </div>
              {Number(invoice.taxAmount) > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>IVA</span><span>{formatCurrency(Number(invoice.taxAmount))}</span>
                </div>
              )}
              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Descuento</span><span>-{formatCurrency(Number(invoice.discountAmount))}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-foreground border-t border-primary/30 pt-2">
                <span>Total</span><span>{formatCurrency(Number(invoice.total))}</span>
              </div>
              {Number(invoice.paidAmount) > 0 && Number(invoice.paidAmount) < Number(invoice.total) && (
                <div className="flex justify-between text-sm text-warning pt-1">
                  <span>Pendiente</span>
                  <span>{formatCurrency(Number(invoice.total) - Number(invoice.paidAmount))}</span>
                </div>
              )}
            </div>

            {/* Payment records */}
            {(invoice.payments ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pagos registrados</p>
                <div className="space-y-2">
                  {(invoice.payments ?? []).map((pay: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-success/10 border border-success/20 rounded-xl p-3">
                      <div className="w-8 h-8 bg-success/15 rounded-lg flex items-center justify-center shrink-0">
                        <MethodIcon method={pay.method} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {METHOD_LABELS[pay.method as string] ?? pay.method}
                          {pay.insurerName && (
                            <span className="ml-1.5 text-xs font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{pay.insurerName}</span>
                          )}
                        </p>
                        {pay.reference && (
                          <p className="text-xs text-muted-foreground truncate">Ref: {pay.reference}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{formatDate(pay.paidAt)}</p>
                        {pay.recordedByName && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <UserCheck className="w-3 h-3" />{pay.recordedByName}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-bold text-success">{formatCurrency(Number(pay.amount))}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas</p>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">{invoice.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
