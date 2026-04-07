'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Bot, MessageSquare, Phone, CheckCircle, TrendingUp, Clock, Zap, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIVITY_LOG = [
  { id: 1, text: 'Recordatorio enviado a Ana Sofía Hernández — Cita mañana 9:00 AM', time: '08:15', type: 'reminder' },
  { id: 2, text: 'María Elena Rodríguez confirmó su cita de las 10:00 AM', time: '08:22', type: 'confirm' },
  { id: 3, text: 'Recordatorio enviado a Laura P. Mendoza — Cita hoy 11:30 AM', time: '08:30', type: 'reminder' },
  { id: 4, text: 'Liga de pago enviada a Fernando Castillo — $4,500 MXN', time: '09:00', type: 'payment' },
  { id: 5, text: 'Alejandra Vargas preguntó: ¿Necesito ir en ayunas?', time: '09:15', type: 'message' },
  { id: 6, text: 'Roberto C. Flores confirmó su cita de las 12:00 PM', time: '09:30', type: 'confirm' },
  { id: 7, text: 'Resultado disponible notificado a Ana Sofía Hernández (perfil tiroideo)', time: '10:00', type: 'result' },
  { id: 8, text: 'Formulario pre-consulta enviado a Carolina Jiménez', time: '10:15', type: 'form' },
]

const TYPE_COLORS: Record<string, string> = {
  reminder: 'text-blue-500',
  confirm: 'text-green-500',
  payment: 'text-purple-500',
  message: 'text-orange-500',
  result: 'text-teal-500',
  form: 'text-indigo-500',
}

const TYPE_DOTS: Record<string, string> = {
  reminder: 'bg-blue-400',
  confirm: 'bg-green-400',
  payment: 'bg-purple-400',
  message: 'bg-orange-400',
  result: 'bg-teal-400',
  form: 'bg-indigo-400',
}

const INTENTS = [
  { label: 'Confirmar cita', count: 145, pct: 35, color: 'bg-blue-500' },
  { label: 'Reagendar cita', count: 62, pct: 15, color: 'bg-green-500' },
  { label: 'Preguntas sobre estudios', count: 48, pct: 12, color: 'bg-orange-500' },
  { label: 'Estado de resultados', count: 41, pct: 10, color: 'bg-teal-500' },
  { label: 'Información de pagos', count: 38, pct: 9, color: 'bg-purple-500' },
  { label: 'Dudas de medicamentos', count: 33, pct: 8, color: 'bg-red-400' },
  { label: 'Otras consultas', count: 45, pct: 11, color: 'bg-gray-400' },
]

const FLOWS = [
  {
    trigger: 'Cita agendada',
    steps: ['Formulario pre-consulta enviado', 'Recordatorio 24h', 'Confirmación recibida'],
    color: 'border-blue-400 bg-blue-50',
  },
  {
    trigger: 'Liga de pago generada',
    steps: ['Enviada por WhatsApp', 'Pago recibido', 'Recibo emitido'],
    color: 'border-green-400 bg-green-50',
  },
  {
    trigger: 'Resultado cargado',
    steps: ['Notificación enviada', 'Paciente revisó resultado'],
    color: 'border-teal-400 bg-teal-50',
  },
]

interface AgentToggle {
  label: string
  enabled: boolean
}

export default function AsistenteIAPage() {
  const [waToggles, setWaToggles] = useState<AgentToggle[]>([
    { label: 'Recordatorios automáticos', enabled: true },
    { label: 'Confirmaciones de cita', enabled: true },
    { label: 'Envío de ligas de pago', enabled: true },
    { label: 'Notificación de resultados', enabled: true },
    { label: 'Respuestas a dudas', enabled: true },
    { label: 'Formulario pre-consulta', enabled: false },
  ])

  const [voiceToggles, setVoiceToggles] = useState<AgentToggle[]>([
    { label: 'Confirmación por llamada', enabled: true },
    { label: 'Recordatorio de cita', enabled: true },
    { label: 'Reagendamiento', enabled: false },
  ])

  function toggleWa(i: number) {
    setWaToggles(t => t.map((item, j) => j === i ? { ...item, enabled: !item.enabled } : item))
  }

  function toggleVoice(i: number) {
    setVoiceToggles(t => t.map((item, j) => j === i ? { ...item, enabled: !item.enabled } : item))
  }

  const kpis = [
    { label: 'Mensajes enviados (mes)', value: '1,247', sub: '+18% vs mes anterior', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Citas confirmadas por IA', value: '89%', sub: 'vs 72% manual', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Tiempo prom. respuesta', value: '< 30s', sub: 'Respuesta inmediata', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Cobros recuperados por IA', value: '$42,800', sub: 'Este mes', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <>
      <Header
        title="Asistente IA"
        subtitle="Agentes inteligentes nativos para comunicación y automatización"
      />

      <div className="flex-1 p-6 overflow-auto space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: agents */}
          <div className="space-y-4">
            {/* WhatsApp Agent */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Agente de WhatsApp</h3>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Activo
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {waToggles.map((t, i) => (
                  <div key={t.label} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm text-gray-700">{t.label}</p>
                    <button onClick={() => toggleWa(i)}
                      className={cn('w-9 h-5 rounded-full flex items-center px-0.5 transition-colors',
                        t.enabled ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start')}>
                      <div className="w-4 h-4 bg-white rounded-full shadow" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Voice Agent */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Agente de Voz</h3>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Activo
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {voiceToggles.map((t, i) => (
                  <div key={t.label} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm text-gray-700">{t.label}</p>
                    <button onClick={() => toggleVoice(i)}
                      className={cn('w-9 h-5 rounded-full flex items-center px-0.5 transition-colors',
                        t.enabled ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start')}>
                      <div className="w-4 h-4 bg-white rounded-full shadow" />
                    </button>
                  </div>
                ))}
                <div className="px-4 py-2.5 bg-gray-50">
                  <p className="text-xs text-gray-500">Llamadas realizadas este mes: <strong className="text-gray-800">312</strong></p>
                </div>
              </div>
            </div>
          </div>

          {/* Center: activity log */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Conversaciones recientes</h3>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {ACTIVITY_LOG.map((item) => (
                <div key={item.id} className="px-4 py-2.5 flex items-start gap-3">
                  <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', TYPE_DOTS[item.type] ?? 'bg-gray-300')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-relaxed">{item.text}</p>
                  </div>
                  <span className={cn('text-xs font-mono shrink-0', TYPE_COLORS[item.type] ?? 'text-gray-400')}>
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: intents + flows */}
          <div className="space-y-4">
            {/* Intent analytics */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Intenciones de pacientes (mes)</h3>
              <div className="space-y-2.5">
                {INTENTS.map((intent) => (
                  <div key={intent.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{intent.label}</span>
                      <span className="text-xs font-semibold text-gray-800">{intent.count} · {intent.pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={cn('h-1.5 rounded-full', intent.color)} style={{ width: `${intent.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Automation flows */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" /> Flujos de automatización
              </h3>
              <div className="space-y-3">
                {FLOWS.map((flow) => (
                  <div key={flow.trigger} className={cn('rounded-lg border-l-4 p-3', flow.color)}>
                    <p className="text-xs font-semibold text-gray-800 mb-2">{flow.trigger}</p>
                    <div className="space-y-1">
                      {flow.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                          <p className="text-xs text-gray-600">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
