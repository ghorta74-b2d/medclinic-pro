'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { X } from 'lucide-react'
import type { Invoice } from 'medclinic-shared'
import { formatCurrency } from '@/lib/utils'

interface RecordPaymentDialogProps {
  invoice: Invoice
  onClose: () => void
  onRecorded: () => void
}

export function RecordPaymentDialog({ invoice, onClose, onRecorded }: RecordPaymentDialogProps) {
  const remaining = Number(invoice.total) - Number(invoice.paidAmount)
  const [amount, setAmount] = useState(remaining.toFixed(2))
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'TRANSFER' | 'INSURANCE'>('CASH')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const METHODS = [
    { value: 'CASH', label: 'Efectivo' },
    { value: 'CARD', label: 'Tarjeta' },
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'INSURANCE', label: 'Aseguradora' },
  ] as const

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Ingrese un monto válido'); return }

    setLoading(true)
    setError('')
    try {
      await api.billing.recordPayment(invoice.id, {
        amount: amt,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
      })
      onRecorded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Registrar pago</h2>
            <p className="text-sm text-gray-500 mt-0.5">Factura {invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total factura</span>
              <span className="font-medium">{formatCurrency(Number(invoice.total), invoice.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ya pagado</span>
              <span className="text-green-600">{formatCurrency(Number(invoice.paidAmount), invoice.currency)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-2 mt-2">
              <span>Pendiente</span>
              <span className="text-orange-600">{formatCurrency(remaining, invoice.currency)}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto a registrar</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input type="number" min="0.01" step="0.01" required
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Forma de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    method === m.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia {method === 'TRANSFER' ? '(CLABE / FOLIO)' : method === 'INSURANCE' ? '(Núm. autorización)' : ''}
            </label>
            <input value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder="Opcional" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional" className={inputClass} />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {loading ? 'Registrando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
