'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Check, ChevronRight, Menu, X,
  Loader2, Send, Brain, FileText, Calendar, Pill,
  Clock, ChevronDown, Zap, Users, Building2, Stethoscope,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import JsonLd, {
  organizationSchema,
  softwareApplicationSchema,
  webSiteSchema,
  faqSchema,
} from '@/components/seo/JsonLd'

/* ── GA4 scaffolding ── */
// TODO: reemplazar 'G-XXXXXXXXXX' con el Measurement ID real de GA4
// import { gtag } from '@/lib/analytics' // descomentar cuando se configure
function trackEvent(name: string) {
  if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
    ;(window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', name)
  }
}

/* ── Fade-up on scroll ── */
function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible(true)
      },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ── Animated counter ── */
function Counter({
  end,
  suffix = '',
  color = '#000',
}: {
  end: number
  suffix?: string
  color?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setStarted(true)
      },
      { threshold: 0.5 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  useEffect(() => {
    if (!started) return
    let raf: number
    let cur = 0
    const step = () => {
      cur += end / 60
      if (cur >= end) {
        setVal(end)
        return
      }
      setVal(Math.floor(cur))
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [started, end])
  return (
    <span ref={ref} style={{ color }}>
      {val.toLocaleString()}
      {suffix}
    </span>
  )
}

/* ── WhatsApp AI Demo ── */
function WhatsAppDemo() {
  const [step, setStep] = useState(0)
  const msgs = [
    { side: 'left',  text: 'Hola Ana 👋 Tu cita es mañana a las 9:00 AM con la Dra. López. ¿Confirmas?' },
    { side: 'right', text: 'Sí, confirmo ✅' },
    { side: 'left',  text: '¡Confirmado! Formulario de pre-consulta: link.mediaclinic.mx/pre 📋' },
    { side: 'left',  text: 'Recuerda llegar 10 min antes 😊' },
  ]
  const delays = [800, 1600, 1800, 1600]
  useEffect(() => {
    if (step >= msgs.length) return
    const t = setTimeout(() => setStep(s => s + 1), delays[step])
    return () => clearTimeout(t)
  }, [step])
  useEffect(() => { const t = setInterval(() => setStep(0), 12000); return () => clearInterval(t) }, [])
  return (
    <div className="w-72 bg-[#111b21] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
      <div className="bg-[#1f2c33] px-4 py-3.5 flex items-center gap-3">
        <div className="w-9 h-9 bg-[#3b2ea8] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">MC</div>
        <div>
          <p className="text-white text-sm font-semibold">MediaClinic IA</p>
          <p className="text-[#8696a0] text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />en línea
          </p>
        </div>
      </div>
      <div className="px-3 py-4 space-y-2.5 min-h-[220px] bg-[#0b141a]">
        {msgs.slice(0, step).map((m, i) => (
          <div key={i} className={`flex ${m.side === 'right' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed ${m.side === 'left' ? 'bg-[#202c33] text-[#e9edef] rounded-tl-sm' : 'bg-[#005c4b] text-[#e9edef] rounded-tr-sm'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {step < msgs.length && (
          <div className="flex justify-start">
            <div className="bg-[#202c33] px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="bg-[#1f2c33]/80 px-4 py-3 flex items-center gap-2 border-t border-white/5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
        <span className="text-[#8696a0] text-xs">3 confirmaciones en la última hora</span>
      </div>
    </div>
  )
}

/* ── Demo form ── */
function DemoForm() {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    clinica: '',
    mensaje: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const set =
    (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    trackEvent('submit_lead')
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-16 px-8">
        <div className="w-14 h-14 rounded-full bg-[#dcfce7] flex items-center justify-center mx-auto mb-6">
          <Check className="w-6 h-6 text-[#1a7f37]" />
        </div>
        <h3 className="text-[24px] font-semibold text-[#1d1d1f] mb-3">¡Listo, te contactamos pronto!</h3>
        <p className="text-[17px] text-[#6e6e73]">Recibirás una respuesta en menos de 24 horas.</p>
      </div>
    )
  }

  const inputCls =
    'w-full bg-white text-[#1d1d1f] placeholder:text-[#aeaeb2] text-[15px] px-4 py-3 rounded-xl border border-[#d2d2d7] focus:outline-none focus:border-[#0071e3] focus:ring-[3px] focus:ring-[#0071e3]/12 transition-all'

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <input required type="text" placeholder="Tu nombre completo" className={inputCls} value={form.nombre} onChange={set('nombre')} />
      <input required type="email" placeholder="Correo electrónico" className={inputCls} value={form.email} onChange={set('email')} />
      <input required type="tel" placeholder="Teléfono" className={inputCls} value={form.telefono} onChange={set('telefono')} />
      <input type="text" placeholder="Nombre de tu clínica (opcional)" className={inputCls} value={form.clinica} onChange={set('clinica')} />
      <textarea rows={3} placeholder="¿Algo que quieras comentarnos?" className={`${inputCls} resize-none`} value={form.mensaje} onChange={set('mensaje')} />
      {status === 'error' && (
        <p className="text-[13px] text-[#cc0000]">
          Hubo un error. Intenta de nuevo o escríbenos a mediaclinic@b2d.mx
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full flex items-center justify-center gap-2 bg-[#0071e3] text-white text-[17px] py-3.5 rounded-full hover:bg-[#0077ed] transition-colors disabled:opacity-60 mt-1"
      >
        <Send className="w-4 h-4" aria-hidden="true" />
        {status === 'loading' ? 'Enviando…' : 'Solicitar llamada'}
      </button>
      <p className="text-center text-[12px] text-[#aeaeb2] pt-1">
        Al enviar aceptas que te contactemos. Sin spam, sin compromiso.
      </p>
    </form>
  )
}

/* ── Plans & comparison data (identical to landing/page.tsx) ── */
const PLANS = [
  {
    id: 'esencial',
    name: 'Esencial',
    monthly: 1299,
    annual: 1169,
    desc: 'Para médicos independientes que quieren crecer.',
    features: [
      'Agenda + confirmación WhatsApp',
      'Expediente clínico NOM-004',
      'Recetas digitales firmadas',
      'Catálogos CIE-10 y CUM/COFEPRIS',
      'Hasta 2 usuarios',
    ],
    hot: false,
  },
  {
    id: 'profesional',
    name: 'Profesional',
    monthly: 2499,
    annual: 2249,
    desc: 'El preferido por clínicas que ya escalan.',
    features: [
      'Todo de Esencial',
      'Cobros y 16 aseguradoras',
      'Pagos en línea con Stripe',
      'Asistente IA 24/7',
      'Analytics básico',
      'Hasta 5 usuarios',
    ],
    hot: true,
  },
  {
    id: 'clinica',
    name: 'Clínica',
    monthly: 4999,
    annual: 4499,
    desc: 'Para grupos con múltiples médicos.',
    features: [
      'Todo de Profesional',
      'Telemedicina integrada',
      'Analytics avanzado',
      'Soporte dedicado',
      'Hasta 20 usuarios',
    ],
    hot: false,
  },
  {
    id: 'clinica-plus',
    name: 'Clínica Plus',
    monthly: null as number | null,
    annual: null as number | null,
    desc: 'Para hospitales y redes de clínicas.',
    features: [
      'Todo de Clínica',
      'Usuarios ilimitados',
      'Multi-sucursal',
      'Integración HL7/FHIR R4',
      'SLA garantizado',
      'Onboarding y capacitación',
      'Soporte 24/7 dedicado',
    ],
    hot: false,
  },
]

type CompRow = { label: string; header?: boolean; values: (boolean | string)[] }
const COMPARE_ROWS: CompRow[] = [
  { label: 'Precio mensual', values: ['$1,299', '$2,499', '$4,999', 'A medida'] },
  { label: 'Usuarios incluidos', values: ['2', '5', '20', 'Sin límite'] },
  { label: 'Agenda & Comunicación', header: true, values: ['', '', '', ''] },
  { label: 'Agenda con citas', values: [true, true, true, true] },
  { label: 'Confirmación WhatsApp', values: [true, true, true, true] },
  { label: 'Expediente clínico', header: true, values: ['', '', '', ''] },
  { label: 'Expediente NOM-004', values: [true, true, true, true] },
  { label: 'Notas firmadas (inmutables)', values: [true, true, true, true] },
  { label: 'Catálogo CIE-10 SSA', values: [true, true, true, true] },
  { label: 'Catálogo CUM/COFEPRIS', values: [true, true, true, true] },
  { label: 'Recetas digitales', values: [true, true, true, true] },
  { label: 'Validación CURP (RENAPO)', values: [true, true, true, true] },
  { label: 'Cobros & Pagos', header: true, values: ['', '', '', ''] },
  { label: 'Módulo de cobros', values: [false, true, true, true] },
  { label: '16 aseguradoras', values: [false, true, true, true] },
  { label: 'Pagos online Stripe', values: [false, true, true, true] },
  { label: 'Asistente IA', header: true, values: ['', '', '', ''] },
  { label: 'IA 24/7', values: [false, true, true, true] },
  { label: 'Resúmenes automáticos', values: [false, true, true, true] },
  { label: 'Cumplimiento', header: true, values: ['', '', '', ''] },
  { label: 'MFA / TOTP', values: [true, true, true, true] },
  { label: 'ARCO / LFPDPPP', values: [true, true, true, true] },
  { label: 'Exportación de datos', values: [false, true, true, true] },
  { label: 'Escala', header: true, values: ['', '', '', ''] },
  { label: 'Analytics básico', values: [false, true, true, true] },
  { label: 'Analytics avanzado', values: [false, false, true, true] },
  { label: 'Telemedicina', values: [false, false, true, true] },
  { label: 'Multi-sucursal', values: [false, false, false, true] },
  { label: 'FHIR R4', values: [false, false, false, true] },
  { label: 'Soporte', header: true, values: ['', '', '', ''] },
  { label: 'Soporte email', values: [true, true, true, true] },
  { label: 'Soporte prioritario', values: [false, false, true, true] },
  { label: 'Soporte 24/7 dedicado', values: [false, false, false, true] },
  { label: 'SLA garantizado', values: [false, false, false, true] },
  { label: 'Capacitación personalizada', values: [false, false, false, true] },
]

/* ── FAQ data ── */
const FAQS = [
  {
    question: '¿Mediaclinic cumple con la NOM-004-SSA3-2012?',
    answer:
      'Sí. El expediente clínico electrónico de Mediaclinic está construido sobre los requisitos de la NOM-004-SSA3-2012 para integración, contenido, conservación y resguardo del expediente. Cada campo obligatorio de la norma está mapeado en el sistema.',
  },
  {
    question: '¿Genera facturas CFDI 4.0 válidas para el SAT?',
    answer:
      'Sí. Mediaclinic se conecta con PACs autorizados por el SAT para timbrar facturas, complementos de pago y notas de crédito en CFDI 4.0 sin que tengas que salir de la plataforma.',
  },
  {
    question: '¿Funciona para clínicas en cualquier ciudad de México?',
    answer:
      'Sí. Mediaclinic opera en toda la República Mexicana. La plataforma es 100% web, así que cualquier clínica con conexión a internet puede usarla, sin importar la ciudad.',
  },
  {
    question: '¿Cómo funciona la IA que toma notas durante la consulta?',
    answer:
      'Con tu autorización y la del paciente, la IA escucha la conversación, transcribe lo relevante y organiza la información en los campos correctos del expediente: motivo de consulta, antecedentes, exploración, diagnóstico y plan. Tú revisas, ajustas si es necesario y firmas. La grabación se elimina al cerrar la nota; solo permanece el texto estructurado del expediente.',
  },
  {
    question: '¿Mis datos y los de mis pacientes salen de México?',
    answer:
      'No. Mediaclinic aloja tu información en servidores ubicados en México y cumple con la LFPDPPP, incluyendo el ejercicio de derechos ARCO de tus pacientes.',
  },
  {
    question: '¿Necesito instalar algo en mi computadora?',
    answer:
      'No. Mediaclinic funciona desde cualquier navegador moderno (Chrome, Safari, Edge, Firefox) en computadora, tablet o celular. No hay descargas ni instalaciones.',
  },
  {
    question: '¿Cuánto cuesta Mediaclinic?',
    answer:
      'Tenemos planes diseñados para consultorios individuales, clínicas multi-especialidad y grupos clínicos con varias sedes. Consulta los detalles en nuestra sección de planes.',
  },
  {
    question: '¿Cómo migro mi información actual a Mediaclinic?',
    answer:
      'Nuestro equipo de onboarding te acompaña en la migración de pacientes, expedientes y agenda durante los primeros 30 días. Aceptamos importación desde Excel, CSV y los principales sistemas del mercado.',
  },
]

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function Landing2Client() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [overHero, setOverHero] = useState(true)
  const [annual, setAnnual] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('checkout=success')) {
      setCheckoutSuccess(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function handleContratar(planId: string) {
    setLoadingPlan(planId)
    trackEvent('view_pricing')
    try {
      const res = await fetch('https://medclinic-api.vercel.app/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, annual }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        setLoadingPlan(null)
      }
    } catch {
      setLoadingPlan(null)
    }
  }

  useLayoutEffect(() => {
    setOverHero(window.scrollY < window.innerHeight * 0.5)
  }, [])

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]) setOverHero(entries[0].isIntersecting)
      },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      className="bg-white text-black overflow-x-hidden"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif" }}
    >
      {/* ── JSON-LD schemas ── */}
      <JsonLd data={organizationSchema()} />
      <JsonLd data={softwareApplicationSchema()} />
      <JsonLd data={webSiteSchema()} />
      <JsonLd data={faqSchema(FAQS)} />

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <nav
        aria-label="Navegación principal"
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          overHero
            ? 'bg-gradient-to-b from-black/55 to-transparent'
            : 'bg-white shadow-sm border-b border-black/8'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#hero" aria-label="Ir al inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={overHero ? '/logo-white.svg' : '/logo-color.svg'}
              alt="Mediaclinic — Software para Clínicas Médicas"
              className="h-10 w-auto transition-all duration-500"
            />
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm">
            {[
              ['#funciones', 'Plataforma'],
              ['#ia', 'IA'],
              ['#precios', 'Precios'],
              ['#faq', 'FAQ'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className={`transition-colors font-medium ${overHero ? 'text-white/80 hover:text-white' : 'text-black/60 hover:text-black'}`}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className={`text-sm font-medium transition-colors ${overHero ? 'text-white/80 hover:text-white' : 'text-black/60 hover:text-black'}`}
            >
              Iniciar sesión
            </Link>
            <a
              href="#precios"
              onClick={() => trackEvent('cta_click_hero')}
              className={`text-sm font-semibold px-5 py-2.5 rounded-full transition-all ${
                overHero
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-[#0071e3] text-white hover:bg-[#0077ed]'
              }`}
            >
              Ver planes
            </a>
          </div>

          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className={`md:hidden ${overHero ? 'text-white' : 'text-black'}`}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-black/8 px-6 py-5 space-y-5">
            {[
              ['#funciones', 'Plataforma'],
              ['#ia', 'IA'],
              ['#precios', 'Precios'],
              ['#faq', 'FAQ'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block text-sm text-black/70"
              >
                {label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-black/70"
            >
              Iniciar sesión
            </Link>
            <a
              href="#precios"
              onClick={() => setMenuOpen(false)}
              className="block text-center text-sm bg-[#0071e3] text-white py-3 rounded-full font-semibold"
            >
              Ver planes
            </a>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════
          HERO — video full screen
      ══════════════════════════════════════════ */}
      <section
        id="hero"
        ref={heroRef}
        aria-label="Presentación principal"
        className="relative h-screen min-h-[640px] flex items-end overflow-hidden"
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/HERO.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pb-24 w-full">
          <p className="text-white/50 text-xs font-semibold tracking-[0.2em] uppercase mb-5">
            Mediaclinic
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.04] tracking-tight max-w-3xl mb-7">
            La clínica del futuro,
            <br />
            disponible hoy.
          </h1>
          <p className="text-white/75 text-lg max-w-xl mb-10 leading-relaxed">
            Mediaclinic es la plataforma todo-en-uno para clínicas y consultorios en México.
            Agenda, <strong className="text-white/90">expediente clínico electrónico</strong>, recetas digitales
            y <strong className="text-white/90">consultas asistidas por IA</strong> que captura la conversación
            con el paciente y organiza el expediente sin que muevas un dedo.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#precios"
              onClick={() => trackEvent('cta_click_hero')}
              className="flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-full font-semibold text-sm hover:bg-white/90 transition-all hover:scale-[1.02]"
            >
              Ver planes <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
            <a
              href="#demo"
              onClick={() => trackEvent('start_demo')}
              className="flex items-center gap-2 border border-white/40 text-white px-7 py-3.5 rounded-full font-semibold text-sm hover:bg-white/10 transition-all"
            >
              Solicitar demo
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          EL PROBLEMA
      ══════════════════════════════════════════ */}
      <section className="bg-[#f5f5f7] py-20 lg:py-28 px-6">
        <div className="max-w-[860px] mx-auto text-center">
          <FadeUp>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold text-[#1d1d1f] tracking-tight mb-8 leading-[1.1]">
              El médico promedio gasta <strong>3 horas al día</strong> en papeleo.
            </h2>
            <p className="text-[18px] text-[#6e6e73] leading-[1.7] max-w-[680px] mx-auto">
              Citas anotadas en cuadernos. Expedientes en Word. Recetas escritas a mano. Pacientes
              que llaman para confirmar y nadie contesta. Facturación pendiente de fin de mes.
              Mientras tanto, el tiempo con el paciente se reduce y el riesgo de incumplir la{' '}
              <strong className="text-[#1d1d1f]">NOM-004</strong> crece.{' '}
              <strong className="text-[#1d1d1f]">Mediaclinic resuelve todo eso desde un solo lugar.</strong>
            </p>
          </FadeUp>
          <div className="mt-10 grid sm:grid-cols-3 gap-4 text-left">
            {([
              { icon: Clock, stat: '3 horas', label: 'en papeleo médico por día', color: '#0071e3' },
              { icon: Calendar, stat: '30%', label: 'de citas con no-show sin recordatorio', color: '#1a7f37' },
              { icon: Stethoscope, stat: '70%', label: 'del tiempo fuera del paciente', color: '#0071e3' },
            ] as const).map(({ icon: Icon, stat, label, color }) => (
              <FadeUp key={label}>
                <div className="bg-white rounded-2xl px-5 py-5 flex items-center gap-4 border border-[#e8e8ed] shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
                    <Icon className="w-5 h-5" style={{ color }} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[20px] font-bold text-[#1d1d1f] leading-none mb-0.5">{stat}</p>
                    <p className="text-[13px] text-[#6e6e73] leading-tight">{label}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          LO QUE HACE MEDIACLINIC
      ══════════════════════════════════════════ */}
      <section id="funciones" className="bg-white py-20 lg:py-28 px-6">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp className="mb-16 text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold text-[#1d1d1f] tracking-tight leading-[1.1]">
              Una plataforma. Cuatro funciones que cambian
              <br className="hidden lg:block" /> el día a día de tu clínica.
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-2 gap-8">
            {/* IA */}
            <FadeUp delay={0}>
              <div id="ia" className="bg-white border border-[#e8e8ed] shadow-[0_2px_16px_rgba(0,0,0,0.06)] rounded-2xl p-8 h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0071e3]/15 to-[#5ac8fa]/8 flex items-center justify-center mb-5">
                  <Brain className="w-6 h-6 text-[#0071e3]" aria-hidden="true" />
                </div>
                <h3 className="text-[22px] font-semibold text-[#1d1d1f] mb-3">
                  Consultas asistidas por IA
                </h3>
                <p className="text-[16px] text-[#6e6e73] leading-[1.65]">
                  La IA escucha la consulta, toma notas en tiempo real y organiza el{' '}
                  <strong className="text-[#1d1d1f]">expediente clínico</strong> automáticamente:
                  motivo de consulta, exploración física, diagnóstico, plan de tratamiento. Tú firmas,
                  ella estructura. <strong className="text-[#1d1d1f]">Recuperas hasta 2 horas al día.</strong>
                </p>
              </div>
            </FadeUp>

            {/* ECE */}
            <FadeUp delay={80}>
              <div className="bg-white border border-[#e8e8ed] shadow-[0_2px_16px_rgba(0,0,0,0.06)] rounded-2xl p-8 h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0071e3]/15 to-[#5ac8fa]/8 flex items-center justify-center mb-5">
                  <FileText className="w-6 h-6 text-[#0071e3]" aria-hidden="true" />
                </div>
                <h3 className="text-[22px] font-semibold text-[#1d1d1f] mb-3">
                  Expediente Clínico Electrónico
                </h3>
                <p className="text-[16px] text-[#6e6e73] leading-[1.65]">
                  <strong className="text-[#1d1d1f]">ECE 100% conforme a la NOM-004-SSA3-2012.</strong>{' '}
                  Antecedentes, notas de evolución, estudios, imágenes y archivos adjuntos en un solo
                  expediente seguro. Búsqueda instantánea por paciente, fecha o diagnóstico.
                </p>
              </div>
            </FadeUp>

            {/* Agenda */}
            <FadeUp delay={160}>
              <div className="bg-white border border-[#e8e8ed] shadow-[0_2px_16px_rgba(0,0,0,0.06)] rounded-2xl p-8 h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0071e3]/15 to-[#5ac8fa]/8 flex items-center justify-center mb-5">
                  <Calendar className="w-6 h-6 text-[#0071e3]" aria-hidden="true" />
                </div>
                <h3 className="text-[22px] font-semibold text-[#1d1d1f] mb-3">
                  Agenda y citas en línea
                </h3>
                <p className="text-[16px] text-[#6e6e73] leading-[1.65]">
                  Tus pacientes agendan desde su celular en menos de 30 segundos.{' '}
                  <strong className="text-[#1d1d1f]">Confirmaciones automáticas por WhatsApp y correo.</strong>{' '}
                  Recordatorios programables. Cero llamadas perdidas, cero huecos en la agenda.
                </p>
              </div>
            </FadeUp>

            {/* Recetas */}
            <FadeUp delay={240}>
              <div className="bg-white border border-[#e8e8ed] shadow-[0_2px_16px_rgba(0,0,0,0.06)] rounded-2xl p-8 h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0071e3]/15 to-[#5ac8fa]/8 flex items-center justify-center mb-5">
                  <Pill className="w-6 h-6 text-[#0071e3]" aria-hidden="true" />
                </div>
                <h3 className="text-[22px] font-semibold text-[#1d1d1f] mb-3">
                  Recetas digitales
                </h3>
                <p className="text-[16px] text-[#6e6e73] leading-[1.65]">
                  Recetas con{' '}
                  <strong className="text-[#1d1d1f]">firma electrónica, código QR de validación</strong> y
                  envío directo al paciente. Catálogo de medicamentos integrado. Historial completo por
                  paciente para detectar interacciones y duplicidades.
                </p>
              </div>
            </FadeUp>
          </div>

          <FadeUp className="mt-12 text-center">
            <a
              href="#precios"
              onClick={() => trackEvent('view_pricing')}
              className="inline-flex items-center gap-2 bg-[#0071e3] text-white px-8 py-4 rounded-full font-semibold text-[16px] hover:bg-[#0077ed] transition-colors"
            >
              Ver planes <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </FadeUp>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ASISTENTE IA
      ══════════════════════════════════════════ */}
      <section id="ia" className="bg-white py-20 lg:py-28 px-6 border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <FadeUp>
            <p className="text-[#6e6e73] text-[12px] uppercase tracking-widest font-medium mb-5">Asistente IA</p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1d1d1f] tracking-tight leading-[1.07] mb-5">
              Tu clínica trabaja<br />aunque no estés.
            </h2>
            <p className="text-[#6e6e73] text-[17px] leading-[1.6] mb-7 max-w-[400px]">
              Agentes de IA que confirman citas, envían ligas de pago y notifican resultados por WhatsApp — los 7 días de la semana.
            </p>
            <ul className="space-y-3.5 mb-8">
              {[
                'Confirmación automática de citas vía WhatsApp',
                'Cobros y ligas de pago sin intervención humana',
                'Notificación de resultados de laboratorio',
                'Formularios de pre-consulta personalizados',
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-[15px] text-[#1d1d1f]">
                  <Check className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <a href="#demo" className="text-[17px] text-[#0071e3] flex items-center gap-0.5 hover:underline w-fit">
              Conocer más <ChevronRight className="w-4 h-4" />
            </a>
          </FadeUp>
          <FadeUp delay={120} className="flex justify-center">
            <WhatsAppDemo />
          </FadeUp>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PARA QUIÉN
      ══════════════════════════════════════════ */}
      <section className="bg-white py-20 lg:py-28 px-6">
        <div className="max-w-[1000px] mx-auto">
          <FadeUp className="mb-14">
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold text-[#1d1d1f] tracking-tight leading-[1.1] text-center">
              Diseñado para la realidad de las clínicas mexicanas.
            </h2>
          </FadeUp>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                icon: Stethoscope,
                title: 'Médicos con consultorio propio',
                desc: 'Que quieren dedicar más tiempo al paciente y menos al expediente.',
              },
              {
                icon: Building2,
                title: 'Clínicas multi-especialidad',
                desc: 'Que necesitan coordinar agenda, ECE y facturación en un solo sistema.',
              },
              {
                icon: Users,
                title: 'Grupos clínicos',
                desc: 'Con varias sedes que requieren control centralizado y reportes consolidados.',
              },
              {
                icon: Zap,
                title: 'Especialidades de alta demanda',
                desc: 'Ginecología, pediatría, dermatología, cardiología, traumatología, medicina interna.',
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <FadeUp key={title} delay={i * 60}>
                <div className="flex items-start gap-4 bg-[#f5f5f7] rounded-2xl p-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3]/15 to-[#5ac8fa]/8 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-[#0071e3]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold text-[#1d1d1f] mb-1">{title}</p>
                    <p className="text-[14px] text-[#6e6e73] leading-[1.5]">{desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CÓMO SE VE UN DÍA CON MEDIACLINIC
      ══════════════════════════════════════════ */}
      <section className="bg-[#f5f5f7] py-20 lg:py-28 px-6">
        <div className="max-w-[860px] mx-auto">
          <FadeUp className="mb-14 text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold text-[#1d1d1f] tracking-tight leading-[1.1]">
              Cómo se ve un día con Mediaclinic.
            </h2>
          </FadeUp>

          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-[22px] top-0 bottom-0 w-px bg-[#d2d2d7] hidden sm:block" aria-hidden="true" />

            <div className="space-y-8">
              {[
                {
                  time: '8:00 AM',
                  text: 'Llegas al consultorio. La agenda del día ya está en tu pantalla con los expedientes precargados.',
                },
                {
                  time: '9:30 AM',
                  text: 'Inicias consulta. La IA escucha, transcribe y organiza el ECE mientras tú hablas con el paciente.',
                },
                {
                  time: '10:15 AM',
                  text: 'Firmas la nota de evolución y la receta digital. El paciente recibe ambos por WhatsApp antes de salir del consultorio.',
                },
                {
                  time: '1:00 PM',
                  text: 'Comes tranquilo. La agenda se llenó sola: tres pacientes agendaron desde el portal en la mañana.',
                },
                {
                  time: '6:00 PM',
                  text: 'Cierras el día. Las facturas del día están listas y timbradas. Cero pendientes administrativos para mañana.',
                },
              ].map(({ time, text }, i) => (
                <FadeUp key={time} delay={i * 80} className="flex gap-6 sm:pl-12 relative">
                  <div className="hidden sm:flex w-[44px] h-[44px] rounded-full bg-[#0071e3] items-center justify-center shrink-0 absolute left-0 top-0 z-10">
                    <Clock className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="bg-white rounded-2xl px-6 py-5 flex-1">
                    <p className="text-[13px] font-semibold text-[#0071e3] mb-1">{time}</p>
                    <p className="text-[16px] text-[#1d1d1f] leading-[1.55]">{text}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-to-b from-[#f5f5f7] to-white py-20 px-6 border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {([
            { end: 2500, suffix: '+', label: 'Médicos activos', color: '#0071e3', icon: Stethoscope },
            { end: 60, suffix: '%', label: 'Menos inasistencias', color: '#1a7f37', icon: Calendar },
            { end: 30, suffix: 's', label: 'Respuesta IA', color: '#0071e3', icon: Brain },
            { end: 100, suffix: '%', label: 'En la nube', color: '#1a7f37', icon: Zap },
          ] as const).map(({ end, suffix, label, color, icon: Icon }, i) => (
            <FadeUp key={label} delay={i * 60}>
              <div className="w-11 h-11 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                <Icon className="w-5 h-5" style={{ color }} aria-hidden="true" />
              </div>
              <p className="text-[clamp(2.2rem,5vw,3.5rem)] font-bold leading-none mb-2">
                <Counter end={end} suffix={suffix} color="#1d1d1f" />
              </p>
              <p className="text-[14px] text-[#6e6e73]">{label}</p>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PRECIOS — copia exacta de landing/page.tsx
      ══════════════════════════════════════════ */}
      <section id="precios" className="bg-white py-20 lg:py-28 px-6 border-t border-[#d2d2d7]">
        <div className="max-w-[1200px] mx-auto">
          {checkoutSuccess && (
            <div className="mb-10 rounded-2xl bg-[#f0faf4] border border-[#34c759]/30 px-6 py-4 flex items-start gap-3">
              <Check className="w-5 h-5 text-[#1a7f37] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[15px] text-[#1a7f37] font-medium">
                ¡Suscripción iniciada! Un especialista te contactará en las próximas horas para
                configurar tu cuenta.
              </p>
            </div>
          )}

          <FadeUp className="mb-14 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1d1d1f] tracking-tight">
              Elige tu plan.
            </h2>
            <div className="inline-flex items-center gap-1 bg-[#f5f5f7] rounded-full p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-[15px] font-medium transition-all ${!annual ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#6e6e73]'}`}
              >
                Mensual
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-full text-[15px] font-medium transition-all flex items-center gap-1.5 ${annual ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#6e6e73]'}`}
              >
                Anual{' '}
                <span className="text-[12px] text-[#1a7f37] font-semibold">−10%</span>
              </button>
            </div>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan, i) => {
              const isPlus = plan.id === 'clinica-plus'
              const price = annual ? plan.annual : plan.monthly
              return (
                <FadeUp key={plan.name} delay={i * 80}>
                  <div
                    className={`rounded-2xl p-7 h-full flex flex-col ${plan.hot ? 'bg-[#1d1d1f]' : 'bg-[#f5f5f7]'}`}
                  >
                    <div className="h-5 mb-3">
                      {plan.hot && (
                        <span className="text-[12px] font-medium text-[#0071e3]">Más popular</span>
                      )}
                      {isPlus && (
                        <span className="text-[12px] font-medium text-[#6e6e73] uppercase tracking-wide">
                          Enterprise
                        </span>
                      )}
                    </div>
                    <h3
                      className={`text-[20px] font-semibold mb-1 ${plan.hot ? 'text-white' : 'text-[#1d1d1f]'}`}
                    >
                      {plan.name}
                    </h3>
                    <p
                      className={`text-[14px] min-h-[2.5rem] mb-5 ${plan.hot ? 'text-white/50' : 'text-[#6e6e73]'}`}
                    >
                      {plan.desc}
                    </p>
                    <div className="mb-8 min-h-[3.5rem] flex flex-col justify-center">
                      {isPlus ? (
                        <>
                          <p className="text-[22px] font-semibold text-[#1d1d1f]">
                            Precio a medida
                          </p>
                          <p className="text-[13px] text-[#6e6e73] mt-0.5">
                            Según el tamaño de tu organización
                          </p>
                        </>
                      ) : (
                        <div>
                          <span
                            className={`text-[42px] font-semibold tabular-nums leading-none ${plan.hot ? 'text-white' : 'text-[#1d1d1f]'}`}
                          >
                            ${price!.toLocaleString()}
                          </span>
                          <span
                            className={`text-[14px] ml-1 ${plan.hot ? 'text-white/40' : 'text-[#6e6e73]'}`}
                          >
                            /mes
                          </span>
                        </div>
                      )}
                    </div>
                    <ul className="space-y-3 flex-1 mb-8">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className={`flex items-start gap-3 text-[14px] ${plan.hot ? 'text-white/70' : 'text-[#1d1d1f]'}`}
                        >
                          <Check
                            className="w-4 h-4 shrink-0 mt-0.5 text-[#0071e3]"
                            aria-hidden="true"
                          />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isPlus ? (
                      <a
                        href="#demo"
                        className="flex items-center justify-center py-3.5 rounded-full text-[16px] font-medium transition-colors bg-[#1d1d1f] text-white hover:bg-black"
                      >
                        Cotizar
                      </a>
                    ) : (
                      <button
                        onClick={() => handleContratar(plan.id)}
                        disabled={loadingPlan !== null}
                        className={`flex items-center justify-center gap-2 py-3.5 rounded-full text-[16px] font-medium transition-colors disabled:opacity-60 ${plan.hot ? 'bg-[#0071e3] text-white hover:bg-[#0077ed]' : 'bg-[#1d1d1f] text-white hover:bg-black'}`}
                      >
                        {loadingPlan === plan.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />{' '}
                            Redirigiendo…
                          </>
                        ) : (
                          'Contratar'
                        )}
                      </button>
                    )}
                  </div>
                </FadeUp>
              )
            })}
          </div>

          <FadeUp>
            <div className="mt-10 flex flex-col items-center gap-4">
              <button
                onClick={() => { setCompareOpen(true); trackEvent('view_pricing') }}
                className="inline-flex items-center gap-1.5 border border-[#d2d2d7] rounded-full px-6 py-2.5 text-[14px] font-medium text-[#1d1d1f] hover:border-[#0071e3] hover:text-[#0071e3] transition-colors"
              >
                Comparar todos los planes{' '}
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <p className="text-center text-[13px] text-[#6e6e73]">
                14 días de prueba gratuita · Cancela cuando quieras
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Comparison Modal ── */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden p-0 bg-white text-[#1d1d1f] flex flex-col">
          <div className="px-8 pt-7 pb-4 shrink-0">
            <DialogTitle className="text-[22px] font-semibold text-[#1d1d1f]">
              Comparar planes
            </DialogTitle>
          </div>
          <div className="overflow-y-auto flex-1 px-8 pb-8">
            <table className="w-full text-[13px] border-separate border-spacing-0">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b">
                  <th className="w-[36%] pb-4 text-left border-b border-[#c7c7cc]" />
                  {PLANS.map((p) => (
                    <th
                      key={p.id}
                      className="pb-4 text-center font-semibold border-b border-[#c7c7cc]"
                    >
                      <p className="text-[14px] text-[#1d1d1f]">{p.name}</p>
                      <p className="text-[12px] text-[#6e6e73] font-normal mt-0.5">
                        {p.monthly ? `$${p.monthly.toLocaleString()}/mes` : 'A medida'}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, idx) =>
                  row.header ? (
                    <tr key={idx}>
                      <td
                        colSpan={5}
                        className="pt-5 pb-1.5 px-0 text-[12px] font-bold text-[#1d1d1f]"
                      >
                        {row.label}
                      </td>
                    </tr>
                  ) : (
                    <tr key={idx} className="border-b border-[#d2d2d7]">
                      <td className="py-2.5 pr-4 text-[#1d1d1f]">{row.label}</td>
                      {row.values.map((val, vi) => (
                        <td key={vi} className="py-2.5 text-center">
                          {typeof val === 'boolean' ? (
                            val ? (
                              <Check
                                className="w-4 h-4 text-[#0071e3] mx-auto"
                                aria-label="Incluido"
                              />
                            ) : (
                              <span className="text-[#c7c7cc] text-[16px] leading-none" aria-label="No incluido">
                                —
                              </span>
                            )
                          ) : (
                            <span className="font-semibold text-[#1d1d1f]">{val}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ),
                )}
                <tr>
                  <td className="pt-6 w-[36%]" />
                  {PLANS.map((p) => (
                    <td key={p.id} className="pt-6 px-1.5">
                      {p.id === 'clinica-plus' ? (
                        <a
                          href="#demo"
                          onClick={() => setCompareOpen(false)}
                          className="flex items-center justify-center py-2.5 rounded-full text-[13px] font-medium bg-[#1d1d1f] text-white hover:bg-black transition-colors"
                        >
                          Cotizar
                        </a>
                      ) : (
                        <button
                          onClick={() => {
                            setCompareOpen(false)
                            handleContratar(p.id)
                          }}
                          disabled={loadingPlan !== null}
                          className={`w-full flex items-center justify-center gap-1 py-2.5 rounded-full text-[13px] font-medium transition-colors disabled:opacity-60 ${p.hot ? 'bg-[#0071e3] text-white hover:bg-[#0077ed]' : 'bg-[#1d1d1f] text-white hover:bg-black'}`}
                        >
                          {loadingPlan === p.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                          ) : null}
                          Contratar
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════ */}
      <section id="faq" className="bg-[#f5f5f7] py-20 lg:py-28 px-6 border-t border-[#d2d2d7]">
        <div className="max-w-[760px] mx-auto">
          <FadeUp className="mb-14 text-center">
            <h2 className="text-[clamp(1.8rem,4vw,2.5rem)] font-semibold text-[#1d1d1f] tracking-tight leading-[1.1]">
              Preguntas frecuentes.
            </h2>
          </FadeUp>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <FadeUp key={i} delay={i * 40}>
                <div className="bg-white rounded-2xl overflow-hidden">
                  <button
                    onClick={() => {
                      setOpenFaq(openFaq === i ? null : i)
                      trackEvent('faq_open')
                    }}
                    aria-expanded={openFaq === i}
                    className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                  >
                    <span className="text-[16px] font-medium text-[#1d1d1f]">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#6e6e73] shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5">
                      <p className="text-[15px] text-[#6e6e73] leading-[1.65]">{faq.answer}</p>
                    </div>
                  )}
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CIERRE
      ══════════════════════════════════════════ */}
      <section className="bg-[#1d1d1f] py-24 lg:py-32 px-6">
        <div className="max-w-[760px] mx-auto text-center">
          <FadeUp>
            <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] font-semibold text-white tracking-tight leading-[1.07] mb-6">
              Recupera el tiempo que el papeleo te quita.
            </h2>
            <p className="text-[18px] text-white/60 leading-[1.65] mb-12 max-w-[580px] mx-auto">
              Empieza a operar tu clínica como debe operarse en 2026: con el expediente al día,
              la agenda llena y la IA tomando notas mientras tú haces lo que solo tú puedes hacer.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="#precios"
                onClick={() => trackEvent('cta_click_footer')}
                className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-semibold text-[16px] hover:bg-white/90 transition-all hover:scale-[1.02]"
              >
                Ver planes <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href="#demo"
                onClick={() => trackEvent('start_demo')}
                className="flex items-center gap-2 border border-white/30 text-white px-8 py-4 rounded-full font-semibold text-[16px] hover:bg-white/10 transition-all"
              >
                Solicitar demo
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          DEMO FORM
      ══════════════════════════════════════════ */}
      <section id="demo" className="bg-white py-20 lg:py-28 px-6 border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto grid lg:grid-cols-2 gap-16 items-start">
          <FadeUp>
            <p className="text-[#6e6e73] text-[12px] uppercase tracking-wide font-medium mb-5">
              Agenda tu demo
            </p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1d1d1f] tracking-tight leading-[1.07] mb-5">
              Moderniza tu clínica.
              <br />
              Empieza hoy.
            </h2>
            <p className="text-[#6e6e73] text-[17px] leading-[1.6] mb-10 max-w-[380px]">
              Completa el formulario y un especialista te contacta en menos de 24 horas para
              mostrarte la plataforma en vivo.
            </p>
            <ul className="space-y-4">
              {[
                'Demo personalizada sin compromiso',
                'Configuración a medida de tu consultorio',
                '14 días de prueba gratuita incluidos',
                'Soporte en español todo el tiempo',
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-[15px] text-[#1d1d1f]">
                  <Check className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </FadeUp>

          <FadeUp delay={100}>
            <div className="bg-white rounded-2xl p-8 border border-[#d2d2d7] shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
              <h3 className="text-[20px] font-semibold text-[#1d1d1f] mb-1">
                Agenda tu llamada gratuita
              </h3>
              <p className="text-[15px] text-[#6e6e73] mb-6">Te contactamos en menos de 24 hrs.</p>
              <DemoForm />
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="bg-[#1d1d1f] border-t border-white/10 py-10 px-6">
        <div className="max-w-[980px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-white.svg"
            alt="Mediaclinic — Software para Clínicas Médicas en México"
            className="h-7 w-auto opacity-40"
          />
          <div className="flex flex-wrap justify-center gap-6 text-[13px] text-white/30">
            <a href="#funciones" className="hover:text-white/60 transition-colors">Plataforma</a>
            <a href="#precios" className="hover:text-white/60 transition-colors">Precios</a>
            <a href="#" className="hover:text-white/60 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white/60 transition-colors">Términos</a>
            <a href="#" className="hover:text-white/60 transition-colors">HIPAA</a>
            <Link href="/login" className="hover:text-white/60 transition-colors">
              Acceso
            </Link>
          </div>
          <p className="text-[13px] text-white/20">© 2026 Mediaclinic</p>
        </div>
        <div className="max-w-[980px] mx-auto mt-6 pt-6 border-t border-white/5 flex justify-center items-center gap-2">
          <span className="text-[11px] text-white/20">Powered by</span>
          <a
            href="https://b2d.mx"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 opacity-30 hover:opacity-60 transition-opacity"
            aria-label="B2D Automation"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-b2d.png" alt="B2D Automation" className="h-4 w-auto" />
            <span className="text-[11px] text-white font-medium">B2D Automation</span>
          </a>
        </div>
      </footer>
    </div>
  )
}
