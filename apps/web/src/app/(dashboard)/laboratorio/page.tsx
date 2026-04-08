'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate, formatRelative } from '@/lib/utils'
import { FlaskConical, Upload, Bell, Eye, CheckCircle, Plus, Loader2, ExternalLink } from 'lucide-react'
import type { LabResult } from 'medclinic-shared'
import { LAB_CATEGORY_LABELS } from 'medclinic-shared'
import { cn } from '@/lib/utils'
import { NewLabResultDialog } from '@/components/lab-results/new-lab-result-dialog'

interface LabResponse { data: LabResult[]; pagination: { total: number } }

const STATUS_CONFIG = {
  PENDING:  { label: 'Pendiente', classes: 'bg-gray-100 text-gray-600' },
  RECEIVED: { label: 'Recibido',  classes: 'bg-yellow-100 text-yellow-700' },
  REVIEWED: { label: 'Revisado',  classes: 'bg-blue-100 text-blue-700' },
  NOTIFIED: { label: 'Notificado', classes: 'bg-green-100 text-green-700' },
}

export default function LaboratorioPage() {
  const [results, setResults] = useState<LabResult[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')
  const [showNew, setShowNew] = useState(false)
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { limit: '50' }
      if (filter !== 'ALL') params['status'] = filter
      const res = await api.labResults.list(params) as LabResponse
      setResults(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function handleNotify(id: string) {
    setActionLoading((a) => ({ ...a, [id]: 'notify' }))
    try {
      await api.labResults.notify(id)
      await load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
    finally { setActionLoading((a) => ({ ...a, [id]: '' })) }
  }

  async function handleReview(id: string) {
    setActionLoading((a) => ({ ...a, [id]: 'review' }))
    try {
      await api.labResults.review(id)
      await load()
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
    finally { setActionLoading((a) => ({ ...a, [id]: '' })) }
  }

  const FILTERS = [
    { value: 'ALL', label: 'Todos' },
    { value: 'PENDING', label: 'Pendientes' },
    { value: 'RECEIVED', label: 'Recibidos' },
    { value: 'REVIEWED', label: 'Revisados' },
    { value: 'NOTIFIED', label: 'Notificados' },
  ]

  return (
    <>
      <Header
        title="Laboratorio"
        subtitle="Resultados de estudios y análisis clínicos"
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Agregar resultado
          </button>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {/* Filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-400'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <FlaskConical className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">No hay resultados para este filtro</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => {
              const status = result.status as keyof typeof STATUS_CONFIG
              const cfg = STATUS_CONFIG[status]

              return (
                <div key={result.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                      <FlaskConical className="w-5 h-5 text-orange-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-gray-900">{result.title}</p>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.classes)}>
                          {cfg.label}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {LAB_CATEGORY_LABELS[result.category]}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mb-1">
                        {result.patient && `${result.patient.firstName} ${result.patient.lastName}`}
                        {result.laboratoryName && ` · ${result.laboratoryName}`}
                        {' · '}{formatRelative(result.createdAt)}
                      </p>

                      {result.notes && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{result.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      {(result.fileUrl || result.externalUrl) && (
                        <a
                          href={result.fileUrl ?? result.externalUrl ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver
                        </a>
                      )}

                      {result.status === 'RECEIVED' && (
                        <button
                          onClick={() => handleReview(result.id)}
                          disabled={actionLoading[result.id] === 'review'}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-300 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50 disabled:opacity-50"
                        >
                          {actionLoading[result.id] === 'review'
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle className="w-3.5 h-3.5" />
                          }
                          Revisar
                        </button>
                      )}

                      {(result.status === 'RECEIVED' || result.status === 'REVIEWED') &&
                       (result.fileUrl || result.externalUrl) && (
                        <button
                          onClick={() => handleNotify(result.id)}
                          disabled={actionLoading[result.id] === 'notify'}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                          {actionLoading[result.id] === 'notify'
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Bell className="w-3.5 h-3.5" />
                          }
                          Notificar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNew && (
        <NewLabResultDialog
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load() }}
        />
      )}
    </>
  )
}
