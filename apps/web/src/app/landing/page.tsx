'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Check, ChevronRight, Menu, X,
  Calendar, Users, Pill, CreditCard, Bot, Video, Send, Loader2,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

/* ── Fade-up on scroll ── */
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

/* ── Animated counter ── */
function Counter({ end, suffix = '', color = '#000' }: { end: number; suffix?: string; color?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) setStarted(true) }, { threshold: 0.5 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  useEffect(() => {
    if (!started) return
    let raf: number; let cur = 0
    const step = () => { cur += end / 60; if (cur >= end) { setVal(end); return }; setVal(Math.floor(cur)); raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [started, end])
  return <span ref={ref} style={{ color }}>{val.toLocaleString()}{suffix}</span>
}

/* ── WhatsApp demo ── */
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
          <div key={i} className={`flex ${m.side === 'right' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed ${m.side === 'left' ? 'bg-[#202c33] text-[#e9edef] rounded-tl-sm' : 'bg-[#005c4b] text-[#e9edef] rounded-tr-sm'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {step < msgs.length && (
          <div className="flex justify-start">
            <div className="bg-[#202c33] px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                {[0,150,300].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
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
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', clinica: '', mensaje: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
      }
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

  const inputCls = "w-full bg-white text-[#1d1d1f] placeholder:text-[#aeaeb2] text-[15px] px-4 py-3 rounded-xl border border-[#d2d2d7] focus:outline-none focus:border-[#0071e3] focus:ring-[3px] focus:ring-[#0071e3]/12 transition-all"

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <input required type="text"  placeholder="Tu nombre completo"          className={inputCls} value={form.nombre}   onChange={set('nombre')} />
      <input required type="email" placeholder="Correo electrónico"          className={inputCls} value={form.email}    onChange={set('email')} />
      <input required type="tel"   placeholder="Teléfono"                    className={inputCls} value={form.telefono} onChange={set('telefono')} />
      <input         type="text"   placeholder="Nombre de tu clínica (opcional)" className={inputCls} value={form.clinica}  onChange={set('clinica')} />
      <textarea      rows={3}      placeholder="¿Algo que quieras comentarnos?" className={`${inputCls} resize-none`}   value={form.mensaje}  onChange={set('mensaje')} />

      {status === 'error' && (
        <p className="text-[13px] text-[#cc0000]">Hubo un error. Intenta de nuevo o escríbenos a mediaclinic@b2d.mx</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full flex items-center justify-center gap-2 bg-[#0071e3] text-white text-[17px] py-3.5 rounded-full hover:bg-[#0077ed] transition-colors disabled:opacity-60 mt-1"
      >
        <Send className="w-4 h-4" />
        {status === 'loading' ? 'Enviando…' : 'Solicitar llamada'}
      </button>

      <p className="text-center text-[12px] text-[#aeaeb2] pt-1">
        Al enviar aceptas que te contactemos. Sin spam, sin compromiso.
      </p>
    </form>
  )
}

const PLANS = [
  {
    id: 'esencial',
    name: 'Esencial',
    monthly: 1299, annual: 1169,
    desc: 'Para médicos independientes que quieren crecer.',
    features: ['Agenda + confirmación WhatsApp', 'Expediente clínico NOM-004', 'Recetas digitales firmadas', 'Catálogos CIE-10 y CUM/COFEPRIS', 'Hasta 2 usuarios'],
    hot: false,
  },
  {
    id: 'profesional',
    name: 'Profesional',
    monthly: 2499, annual: 2249,
    desc: 'El preferido por clínicas que ya escalan.',
    features: ['Todo de Esencial', 'Cobros y 16 aseguradoras', 'Pagos en línea con Stripe', 'Asistente IA 24/7', 'Analytics básico', 'Hasta 5 usuarios'],
    hot: true,
  },
  {
    id: 'clinica',
    name: 'Clínica',
    monthly: 4999, annual: 4499,
    desc: 'Para grupos con múltiples médicos.',
    features: ['Todo de Profesional', 'Telemedicina integrada', 'Analytics avanzado', 'Soporte dedicado', 'Hasta 20 usuarios'],
    hot: false,
  },
  {
    id: 'clinica-plus',
    name: 'Clínica Plus',
    monthly: null as number | null, annual: null as number | null,
    desc: 'Para hospitales y redes de clínicas.',
    features: ['Todo de Clínica', 'Usuarios ilimitados', 'Multi-sucursal', 'Integración HL7/FHIR R4', 'SLA garantizado', 'Onboarding y capacitación', 'Soporte 24/7 dedicado'],
    hot: false,
  },
]

/* ── Comparison table data ── */
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

/* ── Page ── */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [overHero, setOverHero] = useState(true)
  const [annual, setAnnual] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('checkout=success')) {
      setCheckoutSuccess(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function handleContratar(planId: string) {
    setLoadingPlan(planId)
    try {
      const res = await fetch('https://medclinic-api.vercel.app/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, annual }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        setLoadingPlan(null)
      }
    } catch {
      setLoadingPlan(null)
    }
  }

  // Sync before first paint: if already scrolled past hero, show white nav immediately
  useLayoutEffect(() => {
    setOverHero(window.scrollY < window.innerHeight * 0.5)
  }, [])

  // IntersectionObserver handles smooth transitions during user scroll
  useEffect(() => {
    const el = heroRef.current; if (!el) return
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]) setOverHero(entries[0].isIntersecting) },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="bg-white text-black overflow-x-hidden" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif" }}>

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        overHero
          ? 'bg-gradient-to-b from-black/55 to-transparent'
          : 'bg-white shadow-sm border-b border-black/8'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img
            src={overHero ? '/logo-white.svg' : '/logo-color.svg'}
            alt="MediaClinic"
            className="h-10 w-auto transition-all duration-500"
          />

          <div className="hidden md:flex items-center gap-8 text-sm">
            {[['#plataforma','Plataforma'],['#ia','IA'],['#precios','Precios']].map(([href, label]) => (
              <a key={href} href={href} className={`transition-colors font-medium ${overHero ? 'text-white/80 hover:text-white' : 'text-black/60 hover:text-black'}`}>{label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className={`text-sm font-medium transition-colors ${overHero ? 'text-white/80 hover:text-white' : 'text-black/60 hover:text-black'}`}>
              Iniciar sesión
            </Link>
            <a href="#precios" className={`text-sm font-semibold px-5 py-2.5 rounded-full transition-all ${
              overHero ? 'bg-white text-black hover:bg-white/90' : 'bg-[#0071e3] text-white hover:bg-[#0077ed]'
            }`}>
              Ver planes
            </a>
          </div>

          <button onClick={() => setMenuOpen(o => !o)} className={`md:hidden ${overHero ? 'text-white' : 'text-black'}`}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-black/8 px-6 py-5 space-y-5">
            {[['#plataforma','Plataforma'],['#ia','IA'],['#precios','Precios']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block text-sm text-black/70">{label}</a>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-sm text-black/70">Iniciar sesión</Link>
            <a href="#precios" onClick={() => setMenuOpen(false)} className="block text-center text-sm bg-[#0071e3] text-white py-3 rounded-full font-semibold">Ver planes</a>
          </div>
        )}
      </nav>

      {/* ── Hero: video full screen ── */}
      <section ref={heroRef} className="relative h-screen min-h-[640px] flex items-end overflow-hidden">
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
          <source src="/HERO.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pb-24 w-full">
          <p className="text-white/50 text-xs font-semibold tracking-[0.2em] uppercase mb-5">MediaClinic</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.04] tracking-tight max-w-3xl mb-7">
            La clínica del futuro,<br />disponible hoy.
          </h1>
          <p className="text-white/65 text-lg max-w-md mb-10 leading-relaxed">
            Gestión clínica impulsada por IA. Diseñada para médicos en Latinoamérica.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#demo" className="flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-full font-semibold text-sm hover:bg-white/90 transition-all hover:scale-[1.02]">
              Agendar demo gratis <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATEMENT — white, centered
      ══════════════════════════════════════════ */}
      <section className="bg-white py-28 lg:py-36 px-6">
        <div className="max-w-[980px] mx-auto text-center">
          <FadeUp>
            <p className="text-[#6e6e73] text-[17px] mb-5">La plataforma clínica completa.</p>
            <h2 className="text-[clamp(2.4rem,5.5vw,3.8rem)] font-semibold text-[#1d1d1f] leading-[1.06] tracking-tight mb-6">
              Diseñada para la medicina moderna.
            </h2>
            <p className="text-[#6e6e73] text-[17px] leading-[1.6] max-w-[580px] mx-auto mb-10">
              MediaClinic reúne agenda, expediente, recetas, cobros y telemedicina en una sola plataforma — potenciada por inteligencia artificial.
            </p>
            <a href="#precios" className="inline-flex items-center gap-1.5 bg-[#0071e3] text-white text-[17px] px-6 py-3 rounded-full hover:bg-[#0077ed] transition-colors">
              Ver planes <ChevronRight className="w-4 h-4" />
            </a>
          </FadeUp>

          {/* 5-module strip */}
          <FadeUp delay={120}>
            <div className="mt-20 pt-10 border-t border-[#d2d2d7] grid grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-10">
              {[
                { Icon: Calendar,   label: 'Agenda IA',    desc: 'Confirmaciones automáticas' },
                { Icon: Users,      label: 'Expediente',   desc: 'Historia clínica digital' },
                { Icon: Pill,       label: 'Recetas',      desc: 'Digitales con QR' },
                { Icon: CreditCard, label: 'Cobros',       desc: 'Seguros y pagos en línea' },
                { Icon: Video,      label: 'Telemedicina', desc: 'Videoconsulta integrada' },
              ].map(({ Icon, label, desc }) => (
                <div key={label} className="flex flex-col items-center cursor-default">
                  <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-[#1d1d1f]" />
                  </div>
                  <p className="text-[15px] font-semibold text-[#1d1d1f] mb-0.5">{label}</p>
                  <p className="text-[12px] text-[#6e6e73] leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          AGENDA IA — white · text left / mockup right
      ══════════════════════════════════════════ */}
      <section id="plataforma" className="bg-white py-20 lg:py-28 px-6 border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeUp>
            <p className="text-[#6e6e73] text-[12px] uppercase tracking-wide font-medium mb-5">Agenda inteligente</p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1d1d1f] tracking-tight leading-[1.07] mb-5">
              Tu agenda confirma sola.
            </h2>
            <p className="text-[#6e6e73] text-[17px] leading-[1.6] mb-7 max-w-[400px]">
              El asistente IA contacta a cada paciente por WhatsApp, confirma asistencia y gestiona reprogramaciones — sin que muevas un dedo.
            </p>
            <a href="#demo" className="text-[17px] text-[#0071e3] flex items-center gap-0.5 hover:underline w-fit">
              Conocer más <ChevronRight className="w-4 h-4" />
            </a>
          </FadeUp>
          <FadeUp delay={100}>
            <div className="bg-[#f5f5f7] rounded-2xl overflow-hidden">
              <div className="bg-white border-b border-[#d2d2d7] px-5 py-4 flex items-center justify-between">
                <span className="text-[15px] font-semibold text-[#1d1d1f]">Agenda — Hoy</span>
                <span className="text-[12px] text-[#0071e3] font-medium">9 confirmadas</span>
              </div>
              <div className="divide-y divide-[#d2d2d7]/60">
                {[
                  { time: '09:00', name: 'García, Ana',   tag: '✓ Confirmada', ok: true  },
                  { time: '09:30', name: 'Pérez, Luis',   tag: '✓ Confirmada', ok: true  },
                  { time: '10:00', name: 'López, María',  tag: '● Pendiente',  ok: false },
                  { time: '10:30', name: 'Torres, Ramón', tag: '✓ Confirmada', ok: true  },
                ].map(a => (
                  <div key={a.time} className="flex items-center gap-4 px-5 py-3.5 bg-white/70">
                    <span className="text-[13px] text-[#6e6e73] font-mono w-10 shrink-0">{a.time}</span>
                    <span className="text-[15px] text-[#1d1d1f] flex-1">{a.name}</span>
                    <span className={`text-[12px] font-medium ${a.ok ? 'text-[#1a7f37]' : 'text-[#b45309]'}`}>{a.tag}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-[#d2d2d7]/60">
                <p className="text-[12px] text-[#6e6e73]">Confirmaciones enviadas automáticamente · sin intervención humana</p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          EXPEDIENTE — #f5f5f7 · mockup left / text right
      ══════════════════════════════════════════ */}
      <section className="bg-[#f5f5f7] py-20 lg:py-28 px-6">
        <div className="max-w-[980px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeUp>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-[#d2d2d7] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0071e3] flex items-center justify-center text-white text-[11px] font-semibold shrink-0">AG</div>
                <div>
                  <p className="text-[15px] font-semibold text-[#1d1d1f]">García, Ana</p>
                  <p className="text-[12px] text-[#6e6e73]">F · 34 años · Última visita: ayer</p>
                </div>
              </div>
              <div className="divide-y divide-[#d2d2d7]/60">
                {[
                  { label: 'Diagnóstico', value: 'J00 · Rinofaringitis aguda', c: 'text-[#1d1d1f]' },
                  { label: 'Alergias',    value: 'Penicilina',                  c: 'text-[#cc0000]' },
                  { label: 'Presión',     value: '120/80 mmHg',                 c: 'text-[#1a7f37]' },
                  { label: 'Peso',        value: '64 kg · IMC 23.1',            c: 'text-[#1d1d1f]' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-[13px] text-[#6e6e73]">{r.label}</span>
                    <span className={`text-[13px] font-medium ${r.c}`}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 bg-[#f5f5f7] border-t border-[#d2d2d7]">
                <p className="text-[11px] text-[#6e6e73] font-medium uppercase tracking-wide mb-1.5">Notas SOAP</p>
                <p className="text-[13px] text-[#1d1d1f] leading-relaxed">S: Tos seca 3 días, rinorrea clara. O: No fiebre, FC 72. A: J00. P: Reposo, hidratación, amoxicilina...</p>
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={100}>
            <p className="text-[#6e6e73] text-[12px] uppercase tracking-wide font-medium mb-5">Expediente clínico</p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1d1d1f] tracking-tight leading-[1.07] mb-5">
              Historial completo.<br />A la mano.
            </h2>
            <p className="text-[#6e6e73] text-[17px] leading-[1.6] mb-7 max-w-[400px]">
              Notas SOAP, diagnósticos CIE-10, alergias, signos vitales y medicamentos en un expediente digital que abre en segundos.
            </p>
            <a href="#demo" className="text-[17px] text-[#0071e3] flex items-center gap-0.5 hover:underline w-fit">
              Conocer más <ChevronRight className="w-4 h-4" />
            </a>
          </FadeUp>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ASISTENTE IA — white · text left / demo right
      ══════════════════════════════════════════ */}
      <section id="ia" className="bg-white py-20 lg:py-28 px-6 border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeUp>
            <p className="text-[#6e6e73] text-[12px] uppercase tracking-wide font-medium mb-5">Asistente IA</p>
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
                  <Check className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" />
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
          COBROS & RECETAS — #f5f5f7 · 2-col cards
      ══════════════════════════════════════════ */}
      <section className="bg-[#f5f5f7] py-20 lg:py-28 px-6">
        <div className="max-w-[980px] mx-auto">
          <FadeUp className="mb-14">
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1d1d1f] tracking-tight leading-[1.07] mb-3">
              Más que un expediente.
            </h2>
            <p className="text-[#6e6e73] text-[17px] leading-[1.6] max-w-[480px]">
              Cobra, prescribe y conecta con aseguradoras — todo desde la misma pantalla.
            </p>
          </FadeUp>
          <div className="grid lg:grid-cols-2 gap-4">

            {/* Cobros */}
            <FadeUp delay={0}>
              <div className="bg-white rounded-2xl p-8 h-full flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-6">
                  <CreditCard className="w-5 h-5 text-[#1d1d1f]" />
                </div>
                <h3 className="text-[24px] font-semibold text-[#1d1d1f] mb-2">Cobra el 100%.</h3>
                <p className="text-[#6e6e73] text-[17px] leading-[1.6] mb-6">
                  Ligas de pago por WhatsApp y 16 aseguradoras integradas, sin comisión adicional.
                </p>
                <div className="flex-1 divide-y divide-[#d2d2d7]/60 mb-6">
                  {[
                    { name: 'García, Ana',  amount: '$800',   tag: 'Pagado',    ok: true  },
                    { name: 'Pérez, Luis',  amount: '$1,200', tag: 'Pagado',    ok: true  },
                    { name: 'López, María', amount: '$700',   tag: 'Pendiente', ok: false },
                  ].map(p => (
                    <div key={p.name} className="flex items-center gap-3 py-3">
                      <span className="text-[15px] text-[#1d1d1f] flex-1">{p.name}</span>
                      <span className="text-[15px] font-medium text-[#1d1d1f]">{p.amount}</span>
                      <span className={`text-[12px] font-medium px-2.5 py-0.5 rounded-full ${p.ok ? 'text-[#1a7f37] bg-[#dcfce7]' : 'text-[#b45309] bg-[#fef9c3]'}`}>{p.tag}</span>
                    </div>
                  ))}
                </div>
                <a href="#demo" className="text-[17px] text-[#0071e3] flex items-center gap-0.5 hover:underline w-fit">
                  Conocer más <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </FadeUp>

            {/* Recetas */}
            <FadeUp delay={80}>
              <div className="bg-white rounded-2xl p-8 h-full flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-6">
                  <Pill className="w-5 h-5 text-[#1d1d1f]" />
                </div>
                <h3 className="text-[24px] font-semibold text-[#1d1d1f] mb-2">Recetas digitales.</h3>
                <p className="text-[#6e6e73] text-[17px] leading-[1.6] mb-6">
                  Prescripciones con firma electrónica y código QR, enviadas al instante por WhatsApp.
                </p>
                <div className="flex-1 bg-[#f5f5f7] rounded-xl divide-y divide-[#d2d2d7]/60 mb-6">
                  {[
                    { rx: 'Amoxicilina 500mg', sig: '1 cáp. cada 8h × 7 días' },
                    { rx: 'Ibuprofeno 400mg',  sig: '1 tab. cada 12h · SOS' },
                    { rx: 'Loratadina 10mg',   sig: '1 tab. cada 24h × 5 días' },
                  ].map((r, i) => (
                    <div key={i} className="px-4 py-3">
                      <p className="text-[15px] font-medium text-[#1d1d1f]">Rx {r.rx}</p>
                      <p className="text-[13px] text-[#6e6e73] mt-0.5">{r.sig}</p>
                    </div>
                  ))}
                </div>
                <a href="#demo" className="text-[17px] text-[#0071e3] flex items-center gap-0.5 hover:underline w-fit">
                  Conocer más <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </FadeUp>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS — white
      ══════════════════════════════════════════ */}
      <section className="bg-white py-20 px-6 border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            {[
              { end: 2500, suffix: '+', label: 'Médicos activos',     desc: 'En México y LATAM' },
              { end: 60,   suffix: '%', label: 'Menos inasistencias', desc: 'Gracias al asistente IA' },
              { end: 30,   suffix: 's', label: 'Respuesta IA',        desc: 'Disponible las 24 horas' },
              { end: 100,  suffix: '%', label: 'En la nube',          desc: 'Sin instalación ni servidores' },
            ].map((s, i) => (
              <FadeUp key={s.label} delay={i * 80}>
                <div className="text-[48px] lg:text-[56px] font-semibold text-[#1d1d1f] leading-none tabular-nums mb-3">
                  <Counter end={s.end} suffix={s.suffix} color="#1d1d1f" />
                </div>
                <p className="text-[17px] font-semibold text-[#1d1d1f] mb-1">{s.label}</p>
                <p className="text-[15px] text-[#6e6e73]">{s.desc}</p>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIOS — #f5f5f7
      ══════════════════════════════════════════ */}
      <section className="bg-[#f5f5f7] py-20 lg:py-28 px-6">
        <div className="max-w-[980px] mx-auto">
          <FadeUp className="mb-14">
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1d1d1f] tracking-tight">
              Lo dicen los médicos.
            </h2>
          </FadeUp>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { quote: 'Mis inasistencias bajaron 60% en el primer mes. El asistente confirma citas mientras yo duermo.', name: 'Dr. Alejandro Reyes', role: 'Cardiólogo · Monterrey', init: 'AR' },
              { quote: 'Por fin un sistema pensado para México. Elegante, rápido y mis pacientes lo aman desde el primer día.', name: 'Dra. Fernanda Castillo', role: 'Dermatóloga · CDMX', init: 'FC' },
              { quote: 'En 2 semanas recuperé la inversión. Ahora cobro el 100% y tengo todo el historial en mi celular.', name: 'Dr. Ricardo Soto', role: 'Medicina General · Guadalajara', init: 'RS' },
            ].map((t, i) => (
              <FadeUp key={t.name} delay={i * 80}>
                <div className="bg-white rounded-2xl p-8 h-full flex flex-col">
                  <p className="text-[#1d1d1f] text-[17px] leading-[1.6] flex-1 mb-8">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0071e3] flex items-center justify-center text-white text-[12px] font-semibold shrink-0">{t.init}</div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#1d1d1f]">{t.name}</p>
                      <p className="text-[13px] text-[#6e6e73]">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PRECIOS — white
      ══════════════════════════════════════════ */}
      <section id="precios" className="bg-white py-20 lg:py-28 px-6 border-t border-[#d2d2d7]">
        <div className="max-w-[1200px] mx-auto">
          {checkoutSuccess && (
            <div className="mb-10 rounded-2xl bg-[#f0faf4] border border-[#34c759]/30 px-6 py-4 flex items-start gap-3">
              <Check className="w-5 h-5 text-[#1a7f37] shrink-0 mt-0.5" />
              <p className="text-[15px] text-[#1a7f37] font-medium">
                ¡Suscripción iniciada! Un especialista te contactará en las próximas horas para configurar tu cuenta.
              </p>
            </div>
          )}

          <FadeUp className="mb-14 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1d1d1f] tracking-tight">
              Elige tu plan.
            </h2>
            <div className="inline-flex items-center gap-1 bg-[#f5f5f7] rounded-full p-1">
              <button onClick={() => setAnnual(false)} className={`px-5 py-2 rounded-full text-[15px] font-medium transition-all ${!annual ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#6e6e73]'}`}>Mensual</button>
              <button onClick={() => setAnnual(true)} className={`px-5 py-2 rounded-full text-[15px] font-medium transition-all flex items-center gap-1.5 ${annual ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#6e6e73]'}`}>
                Anual <span className="text-[12px] text-[#1a7f37] font-semibold">−10%</span>
              </button>
            </div>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan, i) => {
              const isPlus = plan.id === 'clinica-plus'
              const price = annual ? plan.annual : plan.monthly
              return (
                <FadeUp key={plan.name} delay={i * 80}>
                  <div className={`rounded-2xl p-7 h-full flex flex-col ${plan.hot ? 'bg-[#1d1d1f]' : 'bg-[#f5f5f7]'}`}>
                    {/* Badge row — same height for all */}
                    <div className="h-5 mb-3">
                      {plan.hot && <span className="text-[12px] font-medium text-[#0071e3]">Más popular</span>}
                      {isPlus && <span className="text-[12px] font-medium text-[#6e6e73] uppercase tracking-wide">Enterprise</span>}
                    </div>
                    <h3 className={`text-[20px] font-semibold mb-1 ${plan.hot ? 'text-white' : 'text-[#1d1d1f]'}`}>{plan.name}</h3>
                    {/* Fixed-height desc so price is always at same vertical position */}
                    <p className={`text-[14px] min-h-[2.5rem] mb-5 ${plan.hot ? 'text-white/50' : 'text-[#6e6e73]'}`}>{plan.desc}</p>
                    <div className="mb-8 min-h-[3.5rem] flex flex-col justify-center">
                      {isPlus ? (
                        <>
                          <p className={`text-[22px] font-semibold text-[#1d1d1f]`}>Precio a medida</p>
                          <p className="text-[13px] text-[#6e6e73] mt-0.5">Según el tamaño de tu organización</p>
                        </>
                      ) : (
                        <div>
                          <span className={`text-[42px] font-semibold tabular-nums leading-none ${plan.hot ? 'text-white' : 'text-[#1d1d1f]'}`}>
                            ${price!.toLocaleString()}
                          </span>
                          <span className={`text-[14px] ml-1 ${plan.hot ? 'text-white/40' : 'text-[#6e6e73]'}`}>/mes</span>
                        </div>
                      )}
                    </div>
                    <ul className="space-y-3 flex-1 mb-8">
                      {plan.features.map(f => (
                        <li key={f} className={`flex items-start gap-3 text-[14px] ${plan.hot ? 'text-white/70' : 'text-[#1d1d1f]'}`}>
                          <Check className={`w-4 h-4 shrink-0 mt-0.5 text-[#0071e3]`} />
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
                          <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo…</>
                        ) : 'Contratar'}
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
                onClick={() => setCompareOpen(true)}
                className="inline-flex items-center gap-1.5 border border-[#d2d2d7] rounded-full px-6 py-2.5 text-[14px] font-medium text-[#1d1d1f] hover:border-[#0071e3] hover:text-[#0071e3] transition-colors"
              >
                Comparar todos los planes <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-center text-[13px] text-[#6e6e73]">14 días de prueba gratuita · Cancela cuando quieras</p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Comparison Modal ── */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden p-0 bg-white text-[#1d1d1f] flex flex-col">
          {/* Title — outside scroll area */}
          <div className="px-8 pt-7 pb-4 shrink-0">
            <DialogTitle className="text-[22px] font-semibold text-[#1d1d1f]">Comparar planes</DialogTitle>
          </div>

          {/* Single scrollable area with one unified table (thead sticky) */}
          <div className="overflow-y-auto flex-1 px-8 pb-8">
            <table className="w-full text-[13px] border-separate border-spacing-0">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b">
                  <th className="w-[36%] pb-4 text-left border-b border-[#c7c7cc]" />
                  {PLANS.map(p => (
                    <th key={p.id} className="pb-4 text-center font-semibold border-b border-[#c7c7cc]">
                      <p className="text-[14px] text-[#1d1d1f]">{p.name}</p>
                      <p className="text-[12px] text-[#6e6e73] font-normal mt-0.5">
                        {p.monthly ? `$${p.monthly.toLocaleString()}/mes` : 'A medida'}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, idx) => (
                  row.header ? (
                    <tr key={idx}>
                      <td colSpan={5} className="pt-5 pb-1.5 px-0 text-[12px] font-bold text-[#1d1d1f]">
                        {row.label}
                      </td>
                    </tr>
                  ) : (
                    <tr key={idx} className="border-b border-[#d2d2d7]">
                      <td className="py-2.5 pr-4 text-[#1d1d1f]">{row.label}</td>
                      {row.values.map((val, vi) => (
                        <td key={vi} className="py-2.5 text-center">
                          {typeof val === 'boolean' ? (
                            val
                              ? <Check className="w-4 h-4 text-[#0071e3] mx-auto" />
                              : <span className="text-[#c7c7cc] text-[16px] leading-none">—</span>
                          ) : (
                            <span className="font-semibold text-[#1d1d1f]">{val}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                ))}
                {/* CTA row inside the table so columns stay aligned */}
                <tr>
                  <td className="pt-6 w-[36%]" />
                  {PLANS.map(p => (
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
                          onClick={() => { setCompareOpen(false); handleContratar(p.id) }}
                          disabled={loadingPlan !== null}
                          className={`w-full flex items-center justify-center gap-1 py-2.5 rounded-full text-[13px] font-medium transition-colors disabled:opacity-60 ${p.hot ? 'bg-[#0071e3] text-white hover:bg-[#0077ed]' : 'bg-[#1d1d1f] text-white hover:bg-black'}`}
                        >
                          {loadingPlan === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
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
          DEMO FORM — white
      ══════════════════════════════════════════ */}
      <section id="demo" className="bg-white py-20 lg:py-28 px-6 border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto grid lg:grid-cols-2 gap-16 items-start">

          {/* Left: copy */}
          <FadeUp>
            <p className="text-[#6e6e73] text-[12px] uppercase tracking-wide font-medium mb-5">Agenda tu demo</p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold text-[#1d1d1f] tracking-tight leading-[1.07] mb-5">
              Moderniza tu clínica.<br />Empieza hoy.
            </h2>
            <p className="text-[#6e6e73] text-[17px] leading-[1.6] mb-10 max-w-[380px]">
              Completa el formulario y un especialista te contacta en menos de 24 horas para mostrarte la plataforma en vivo.
            </p>
            <ul className="space-y-4">
              {[
                'Demo personalizada sin compromiso',
                'Configuración a medida de tu consultorio',
                '14 días de prueba gratuita incluidos',
                'Soporte en español todo el tiempo',
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-[15px] text-[#1d1d1f]">
                  <Check className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </FadeUp>

          {/* Right: form */}
          <FadeUp delay={100}>
            <div className="bg-white rounded-2xl p-8 border border-[#d2d2d7] shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
              <h3 className="text-[20px] font-semibold text-[#1d1d1f] mb-1">Agenda tu llamada gratuita</h3>
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
          <img src="/logo-white.svg" alt="MedClinic" className="h-7 w-auto opacity-40" />
          <div className="flex flex-wrap justify-center gap-6 text-[13px] text-white/30">
            {['Plataforma','Precios','Privacidad','Términos','HIPAA'].map(l => (
              <a key={l} href="#" className="hover:text-white/60 transition-colors">{l}</a>
            ))}
            <Link href="/login" className="hover:text-white/60 transition-colors">Acceso</Link>
          </div>
          <p className="text-[13px] text-white/20">© 2026 MediaClinic</p>
        </div>
      </footer>
    </div>
  )
}
