'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { X, Loader2, CreditCard, Banknote, ArrowLeftRight, Building2 } from 'lucide-react'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { INVOICE_STATUS_LABELS } from 'medclinic-shared'

interface InvoiceDetailDialogProps {
  invoiceId: string
  onClose: () => void
}

const STATUS_CLASSES: Record<string, string> = {
  DRAFT:          'bg-gray-100 text-gray-600',
  SENT:           'bg-blue-100 text-blue-700',
  PAID:           'bg-green-100 text-green-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  OVERDUE:        'bg-red-100 text-red-700',
  CANCELLED:      'bg-gray-100 text-gray-400',
  REFUNDED:       'bg-purple-100 text-purple-700',
}

const METHOD_LABELS: Record<string, string> = {
  CASH:          'Efectivo',
  CARD:          'Tarjeta',
  TRANSFER:      'SPEI / Transferencia',
  INSURANCE:     'Seguro',
  STRIPE_ONLINE: 'Pago en línea',
}

function MethodIcon({ method }: { method: string }) {
  const cls = 'w-4 h-4 text-green-600'
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {invoice ? invoice.invoiceNumber : 'Factura'}
            </h2>
            {invoice && (
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(invoice.issuedAt)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {invoice && (
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_CLASSES[invoice.status] ?? '')}>
                {INVOICE_STATUS_LABELS[invoice.status as keyof typeof INVOICE_STATUS_LABELS] ?? invoice.status}
              </span>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : !invoice ? (
          <div className="text-center py-12 text-sm text-gray-400">No se pudo cargar la factura</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Patient */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">Paciente</p>
              <p className="text-sm font-semibold text-gray-900">
                {invoice.patient?.firstName} {invoice.patient?.lastName}
              </p>
              {invoice.patient?.phone && (
                <p className="text-xs text-gray-400">{invoice.patient.phone}</p>
              )}
            </div>

            {/* Line items */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Conceptos</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">Descripción</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-500">Cant.</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-500">Precio</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(invoice.items ?? []).map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="px-3 py-2.5">
                          <p className="text-sm text-gray-900">{item.description}</p>
                          {Number(item.taxRate) > 0 && (
                            <p className="text-[10px] text-blue-500">
                              IVA {(Number(item.taxRate) * 100).toFixed(0)}%
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-sm text-gray-600">{Number(item.quantity)}</td>
                        <td className="px-3 py-2.5 text-right text-sm text-gray-600">{formatCurrency(Number(item.unitPrice))}</td>
                        <td className="px-3 py-2.5 text-right text-sm font-medium text-gray-900">{formatCurrency(Number(item.total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-blue-50 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{formatCurrency(Number(invoice.subtotal))}</span>
              </div>
              {Number(invoice.taxAmount) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IVA</span><span>{formatCurrency(Number(invoice.taxAmount))}</span>
                </div>
              )}
              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento</span><span>-{formatCurrency(Number(invoice.discountAmount))}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-blue-200 pt-2">
                <span>Total</span><span>{formatCurrency(Number(invoice.total))}</span>
              </div>
              {Number(invoice.paidAmount) > 0 && Number(invoice.paidAmount) < Number(invoice.total) && (
                <div className="flex justify-between text-sm text-orange-600 pt-1">
                  <span>Pendiente</span>
                  <span>{formatCurrency(Number(invoice.total) - Number(invoice.paidAmount))}</span>
                </div>
              )}
            </div>

            {/* Payment records */}
            {(invoice.payments ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pagos registrados</p>
                <div className="space-y-2">
                  {(invoice.payments ?? []).map((pay: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl p-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                        <MethodIcon method={pay.method} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {METHOD_LABELS[pay.method as string] ?? pay.method}
                        </p>
                        {pay.reference && (
                          <p className="text-xs text-gray-400 truncate">Ref: {pay.reference}</p>
                        )}
                        <p className="text-xs text-gray-400">{formatDate(pay.paidAt)}</p>
                      </div>
                      <p className="text-sm font-bold text-green-700">{formatCurrency(Number(pay.amount))}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notas</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{invoice.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
