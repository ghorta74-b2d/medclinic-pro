'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { MessageCircle, Loader2, Pencil, Printer, Calendar, User, QrCode, ExternalLink, RefreshCw } from 'lucide-react'
import type { Prescription } from 'medclinic-shared'

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:    'bg-success/15 text-success',
  COMPLETED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/15 text-destructive',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activa', COMPLETED: 'Completada', CANCELLED: 'Cancelada',
}

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? ''

interface Props {
  prescription: Prescription
  onChanged: () => void
  onEdit: (rx: Prescription) => void
  readOnly?: boolean
  showPatientName?: boolean
}

export function PrescriptionCard({ prescription: rx, onChanged, onEdit, readOnly = false, showPatientName = true }: Props) {
  const router = useRouter()
  const [waLoading, setWaLoading] = useState(false)
  const [rxeLoading, setRxeLoading] = useState(false)
  const [waConfirm, setWaConfirm] = useState(false)

  const expired = !!(rx.expiresAt && new Date(rx.expiresAt) < new Date())

  async function handleGenerateRxe() {
    setRxeLoading(true)
    try { await api.prescriptions.generateRxe(rx.id); onChanged() }
    catch (err) { alert(err instanceof Error ? err.message : 'Error al generar RxE') }
    finally { setRxeLoading(false) }
  }

  async function handleSendWhatsApp() {
    setWaLoading(true)
    setWaConfirm(false)
    try { await api.prescriptions.sendWhatsApp(rx.id); onChanged() }
    catch (err) { alert(err instanceof Error ? err.message : 'Error al enviar WhatsApp') }
    finally { setWaLoading(false) }
  }

  function rxeChip() {
    if (!rx.publicSlug) return null
    if (expired || rx.rxeStatus === 'EXPIRED') {
      return (
        <span className="text-xs bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full font-medium">
          RxE Expirada
        </span>
      )
    }
    return (
      <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
        RxE Activa
      </span>
    )
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted">
        <div className="flex items-center gap-3">
          {showPatientName ? (
            <>
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {rx.patient?.firstName} {rx.patient?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dr. {rx.doctor?.firstName} {rx.doctor?.lastName} · {formatDate(rx.createdAt)}
                </p>
              </div>
            </>
          ) : (
            <p className="text-xs text-foreground/80 font-medium">
              Dr. {rx.doctor?.firstName} {rx.doctor?.lastName}
              <span className="font-normal text-muted-foreground"> · {formatDate(rx.createdAt)}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {rx.sentViaWhatsApp && (
            <span className="text-xs bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full font-medium">
              ✓ Enviada
            </span>
          )}
          {rxeChip()}
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_STYLE[rx.status] ?? STATUS_STYLE['ACTIVE']}`}>
            {STATUS_LABEL[rx.status] ?? rx.status}
          </span>
        </div>
      </div>

      {/* Medications */}
      <div className="px-5 py-4">
        <div className="space-y-2">
          {rx.items?.map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">
                {i + 1}
              </span>
              <div>
                <span className="text-sm font-semibold text-foreground">{item.medicationName}</span>
                <span className="text-sm text-muted-foreground"> {item.dose}</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.route} · {item.frequency} · {item.duration}
                  {item.instructions && ` · ${item.instructions}`}
                </p>
              </div>
            </div>
          ))}
        </div>

        {rx.instructions && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border italic">
            {rx.instructions}
          </p>
        )}

        {rx.followUpDate && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">
              Seguimiento: <span className="font-medium text-foreground/80">{formatDate(rx.followUpDate)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-border bg-muted">
        <button
          onClick={() => router.push(`/recetas/${rx.id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground/80 hover:bg-card transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Ver / Imprimir
        </button>

        {!readOnly && rx.status === 'ACTIVE' && (
          <button
            onClick={() => onEdit(rx)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground/80 hover:bg-card transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
        )}

        {/* RxE — Generar / Regenerar / Ver pública */}
        {!readOnly && (
          !rx.publicSlug ? (
            <button
              onClick={handleGenerateRxe}
              disabled={rxeLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-primary/30 bg-primary/5 text-primary rounded-lg text-xs font-medium hover:bg-primary/10 disabled:opacity-50 transition-colors"
            >
              {rxeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
              Generar RxE
            </button>
          ) : expired ? (
            <button
              onClick={handleGenerateRxe}
              disabled={rxeLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-card disabled:opacity-50 transition-colors"
            >
              {rxeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Regenerar RxE
            </button>
          ) : (
            <a
              href={`${APP_URL}/r/${rx.publicSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-primary/30 bg-primary/5 text-primary rounded-lg text-xs font-medium hover:bg-primary/10 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver Receta Pública
            </a>
          )
        )}

        {/* WhatsApp */}
        {!readOnly && rx.publicSlug && !expired && (
          <div className="ml-auto">
            <button
              onClick={() => setWaConfirm(true)}
              disabled={waLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-success hover:bg-success/90 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
            >
              {waLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
              {rx.sentViaWhatsApp ? 'Reenviar WhatsApp' : 'Enviar WhatsApp'}
            </button>
          </div>
        )}
      </div>

      {/* WhatsApp confirmation dialog */}
      {waConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-sm font-semibold text-foreground mb-1">Enviar Receta por WhatsApp</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Se enviará el enlace de la receta electrónica al número:
              <br />
              <span className="font-mono font-semibold text-foreground mt-1 block">
                {(rx as any).patient?.phone ?? 'Número no disponible'}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mb-5">
              Paciente: <strong>{rx.patient?.firstName} {rx.patient?.lastName}</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setWaConfirm(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendWhatsApp}
                disabled={waLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-success hover:bg-success/90 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
              >
                {waLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                Confirmar envío
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
