'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Check, ChevronRight, Menu, X,
  Calendar, Users, Pill, CreditCard, Video, Bot,
} from 'lucide-react'

/* ── Fade-up on scroll ── */
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ── Animated counter ── */
function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true) }, { threshold: 0.5 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  useEffect(() => {
    if (!started) return
    let raf: number; let cur = 0
    const step = () => { cur += end / 60; if (cur >= end) { setVal(end); return }; setVal(Math.floor(cur)); raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [started, end])
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
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

/* ── Feature steps data ── */
const STEPS = [
  {
    number: '01',
    title: 'Agenda que trabaja sola.',
    body: 'Cada cita se confirma automáticamente por WhatsApp. Sin llamadas, sin no-shows, sin estrés. Tu asistente IA gestiona recordatorios, reprogramaciones y formularios de pre-consulta.',
    icon: Calendar,
  },
  {
    number: '02',
    title: 'Expediente clínico, reinventado.',
    body: 'Notas SOAP, CIE-10, signos vitales, historial de alergias y recetas en un solo lugar. Plantillas por especialidad que reducen el tiempo de documentación en un 70%.',
    icon: Users,
  },
  {
    number: '03',
    title: 'Cobra el 100% de tus consultas.',
    body: 'Ligas de pago por WhatsApp, 16 aseguradoras integradas, y desglose completo por concepto. Elimina los cobros pendientes y recupera ingresos que se pierden cada día.',
    icon: CreditCard,
  },
  {
    number: '04',
    title: 'Recetas y resultados al instante.',
    body: 'Prescripciones digitales con firma electrónica enviadas por WhatsApp. Resultados de laboratorio con análisis por IA que notifica automáticamente a paciente y médico.',
    icon: Pill,
  },
]

const PLANS = [
  { name: 'Esencial', monthly: 1299, annual: 1169, features: ['Agenda + WhatsApp', 'Expediente clínico', 'Recetas digitales', 'Hasta 2 usuarios'], hot: false },
  { name: 'Profesional', monthly: 2499, annual: 2249, features: ['Todo de Esencial', 'Cobros y aseguradoras', 'Asistente IA 24/7', 'Hasta 5 usuarios'], hot: true },
  { name: 'Clínica', monthly: 4999, annual: 4499, features: ['Todo de Profesional', 'Telemedicina integrada', 'Hasta 20 usuarios', 'Analytics avanzado'], hot: false },
]

/* ── Page ── */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [annual, setAnnual] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Sticky steps observer
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = stepRefs.current.indexOf(e.target as HTMLDivElement)
            if (idx !== -1) setActiveStep(idx)
          }
        })
      },
      { threshold: 0.5 }
    )
    stepRefs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <div className="bg-[#f9f9f7] text-[#1d1d1f] overflow-x-hidden" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif" }}>

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#f9f9f7]/90 backdrop-blur-2xl border-b border-black/5' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <img
            src={scrolled ? '/logo_final.png' : '/logo_white_comp.svg'}
            alt="MediaClinic"
            className="h-7 w-auto transition-all duration-500"
          />

          <div className="hidden md:flex items-center gap-7 text-sm">
            {[['#plataforma','Plataforma'],['#ia','IA'],['#precios','Precios']].map(([href, label]) => (
              <a key={href} href={href} className={`transition-colors ${scrolled ? 'text-[#1d1d1f]/70 hover:text-[#1d1d1f]' : 'text-white/80 hover:text-white'}`}>{label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className={`text-sm transition-colors ${scrolled ? 'text-[#1d1d1f]/70 hover:text-[#1d1d1f]' : 'text-white/80 hover:text-white'}`}>
              Iniciar sesión
            </Link>
            <a href="#precios" className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${scrolled ? 'bg-[#1d1d1f] text-white hover:bg-[#333]' : 'bg-white text-[#1d1d1f] hover:bg-white/90'}`}>
              Ver demo
            </a>
          </div>

          <button onClick={() => setMenuOpen(o => !o)} className={`md:hidden ${scrolled ? 'text-[#1d1d1f]' : 'text-white'}`}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-[#f9f9f7]/95 backdrop-blur-xl border-t border-black/5 px-6 py-5 space-y-5">
            {[['#plataforma','Plataforma'],['#ia','IA'],['#precios','Precios']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block text-sm text-[#1d1d1f]/70">{label}</a>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-sm text-[#1d1d1f]/70">Iniciar sesión</Link>
            <a href="#precios" onClick={() => setMenuOpen(false)} className="block text-center text-sm bg-[#1d1d1f] text-white py-3 rounded-full font-medium">Ver demo</a>
          </div>
        )}
      </nav>

      {/* ── Hero: video full screen ── */}
      <section className="relative h-screen min-h-[600px] flex items-end overflow-hidden">
        {/* Video */}
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/HERO.mp4" type="video/mp4" />
        </video>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Content — bottom aligned, Apple style */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 pb-20 w-full">
          <p className="text-white/60 text-sm font-medium tracking-widest uppercase mb-4">MediaClinic</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight max-w-3xl mb-8">
            La clínica del futuro,<br />disponible hoy.
          </h1>
          <p className="text-white/70 text-lg max-w-xl mb-10 leading-relaxed">
            Gestión clínica impulsada por IA. Diseñada para médicos y clínicas en Latinoamérica.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="#plataforma" className="flex items-center gap-2 bg-white text-[#1d1d1f] px-6 py-3.5 rounded-full font-semibold text-sm hover:bg-white/90 transition-all hover:scale-[1.02]">
              Descubrir la plataforma <ArrowRight className="w-4 h-4" />
            </a>
            <Link href="/login" className="flex items-center gap-2 bg-white/15 backdrop-blur text-white px-6 py-3.5 rounded-full font-semibold text-sm border border-white/25 hover:bg-white/25 transition-all">
              Iniciar sesión
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-px h-8 bg-white/30" />
        </div>
      </section>

      {/* ── Statement section — Apple style ── */}
      <section className="bg-[#f9f9f7] py-32 px-6">
        <FadeUp className="max-w-4xl mx-auto text-center">
          <p className="text-[#6e6e73] text-lg sm:text-xl leading-relaxed max-w-3xl mx-auto">
            <span className="text-[#1d1d1f] font-semibold">Olvídate de 5 herramientas distintas.</span>
            {' '}MediaClinic centraliza agenda, expedientes, recetas, cobros, telemedicina y un asistente IA que trabaja 24/7 — todo en un solo lugar, diseñado específicamente para Latinoamérica.
          </p>
        </FadeUp>
      </section>

      {/* ── Stats — huge numbers, Apple style ── */}
      <section className="bg-[#1d1d1f] py-32 px-6">
        <FadeUp className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
            {[
              { end: 2500, suffix: '+', label: 'Médicos activos' },
              { end: 60,   suffix: '%', label: 'Menos inasistencias' },
              { end: 30,   suffix: 's', label: 'Respuesta del IA' },
              { end: 100,  suffix: '%', label: 'En la nube, sin instalación' },
            ].map((s, i) => (
              <FadeUp key={s.label} delay={i * 80} className="border border-white/8 px-8 py-10">
                <div className="text-5xl lg:text-6xl font-bold text-white mb-3 tabular-nums">
                  <Counter end={s.end} suffix={s.suffix} />
                </div>
                <div className="text-[#6e6e73] text-sm leading-snug">{s.label}</div>
              </FadeUp>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ── Feature steps — sticky scroll ── */}
      <section id="plataforma" className="bg-[#f9f9f7] py-32">
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp className="mb-20">
            <p className="text-[#6e6e73] text-xs font-semibold uppercase tracking-widest mb-4">Plataforma</p>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-[#1d1d1f] max-w-xl">
              Todo lo que tu consultorio necesita.
            </h2>
          </FadeUp>

          <div className="lg:grid lg:grid-cols-2 lg:gap-24 items-start">
            {/* Left: step list */}
            <div className="space-y-0">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.number}
                    ref={el => { stepRefs.current[i] = el }}
                    className="py-12 border-t border-black/8 cursor-default group"
                  >
                    <div className="flex items-start gap-5">
                      <span className={`text-xs font-bold tabular-nums mt-1 transition-colors duration-300 ${activeStep === i ? 'text-blue-600' : 'text-[#6e6e73]'}`}>
                        {step.number}
                      </span>
                      <div>
                        <h3 className={`text-xl font-bold mb-3 transition-colors duration-300 ${activeStep === i ? 'text-[#1d1d1f]' : 'text-[#6e6e73]'}`}>
                          {step.title}
                        </h3>
                        <p className={`text-sm leading-relaxed transition-all duration-300 ${activeStep === i ? 'text-[#3d3d3f] max-h-40 opacity-100' : 'text-[#6e6e73] max-h-0 lg:max-h-40 opacity-100 lg:opacity-0'}`}>
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right: visual — hidden on mobile */}
            <div className="hidden lg:block sticky top-28 self-start">
              <div className="aspect-square bg-[#1d1d1f] rounded-3xl overflow-hidden flex items-center justify-center relative">
                {STEPS.map((step, i) => {
                  const Icon = step.icon
                  return (
                    <div
                      key={i}
                      className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-700"
                      style={{ opacity: activeStep === i ? 1 : 0, transform: activeStep === i ? 'scale(1)' : 'scale(0.92)' }}
                    >
                      <div className="w-24 h-24 rounded-3xl bg-white/8 border border-white/10 flex items-center justify-center mb-6">
                        <Icon className="w-10 h-10 text-white/80" />
                      </div>
                      <p className="text-white/80 text-xl font-semibold text-center px-10">{step.title}</p>
                      <p className="text-[#6e6e73] text-sm text-center px-12 mt-3 leading-relaxed">{step.body}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── IA Section — dark, full width ── */}
      <section id="ia" className="bg-[#1d1d1f] py-32 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <FadeUp>
              <p className="text-[#6e6e73] text-xs font-semibold uppercase tracking-widest mb-6">Asistente IA</p>
              <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight mb-8">
                Tu clínica funciona<br />
                <span className="text-[#6e6e73]">aunque no estés.</span>
              </h2>
              <p className="text-[#6e6e73] text-lg leading-relaxed mb-10 max-w-lg">
                Nuestros agentes de WhatsApp y voz confirman citas, cobran pagos, notifican resultados y responden preguntas — las 24 horas, los 7 días, sin intervención humana.
              </p>
              <ul className="space-y-4">
                {[
                  'Confirmación automática de citas',
                  'Cobros y ligas de pago sin staff',
                  'Notificación de resultados al instante',
                  'Respuestas 24/7 a preguntas frecuentes',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#a1a1a6]">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeUp>

            <FadeUp delay={150} className="flex justify-center lg:justify-end">
              <WhatsAppDemo />
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Testimonials — white, minimal ── */}
      <section className="bg-[#f9f9f7] py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="mb-16">
            <p className="text-[#6e6e73] text-xs font-semibold uppercase tracking-widest mb-4">Testimonios</p>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-[#1d1d1f]">Lo dicen nuestros médicos.</h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: 'Mis inasistencias bajaron 60% en el primer mes. El asistente de WhatsApp confirma citas mientras yo duermo.', name: 'Dr. Alejandro Reyes', role: 'Cardiólogo · Monterrey', init: 'AR' },
              { quote: 'Por fin un sistema pensado para México. Elegante, rápido y mis pacientes lo aman desde el primer día.', name: 'Dra. Fernanda Castillo', role: 'Dermatóloga · CDMX', init: 'FC' },
              { quote: 'En 2 semanas recuperé la inversión. Ahora cobro el 100% y tengo todo el historial en mi celular.', name: 'Dr. Ricardo Soto', role: 'Medicina General · Guadalajara', init: 'RS' },
            ].map((t, i) => (
              <FadeUp key={t.name} delay={i * 80}>
                <div className="bg-white rounded-3xl p-8 border border-black/5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                  <p className="text-[#3d3d3f] text-[15px] leading-relaxed flex-1 mb-8">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1d1d1f] flex items-center justify-center text-white text-xs font-bold shrink-0">{t.init}</div>
                    <div>
                      <p className="font-semibold text-sm text-[#1d1d1f]">{t.name}</p>
                      <p className="text-xs text-[#6e6e73]">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Insurers ── */}
      <div className="border-y border-black/8 py-8 overflow-hidden bg-white">
        <p className="text-center text-[10px] text-[#6e6e73] uppercase tracking-[0.25em] mb-6">Compatible con</p>
        <div className="flex gap-12 animate-marquee whitespace-nowrap w-max">
          {['GNP Seguros','AXA','Metlife','Seguros Monterrey','Mapfre','Zurich','BBVA Seguros','Inbursa','GNP Seguros','AXA','Metlife','Seguros Monterrey','Mapfre','Zurich','BBVA Seguros','Inbursa','GNP Seguros','AXA','Metlife','Seguros Monterrey','Mapfre','Zurich','BBVA Seguros','Inbursa'].map((ins, i) => (
            <span key={i} className="text-[#6e6e73] text-sm font-medium shrink-0">{ins}</span>
          ))}
        </div>
      </div>

      {/* ── Pricing ── */}
      <section id="precios" className="bg-[#f9f9f7] py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <p className="text-[#6e6e73] text-xs font-semibold uppercase tracking-widest mb-4">Precios</p>
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-[#1d1d1f]">Elige tu plan.</h2>
            </div>
            <div className="inline-flex items-center gap-1 bg-black/5 rounded-full p-1">
              <button onClick={() => setAnnual(false)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#6e6e73]'}`}>Mensual</button>
              <button onClick={() => setAnnual(true)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${annual ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#6e6e73]'}`}>
                Anual <span className="text-xs text-green-600 font-semibold">−10%</span>
              </button>
            </div>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map((plan, i) => (
              <FadeUp key={plan.name} delay={i * 80}>
                <div className={`rounded-3xl p-8 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 ${plan.hot ? 'bg-[#1d1d1f] text-white' : 'bg-white border border-black/8 hover:shadow-lg'}`}>
                  {plan.hot && <span className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4 block">Más popular</span>}
                  <h3 className={`text-lg font-bold mb-1 ${plan.hot ? 'text-white' : 'text-[#1d1d1f]'}`}>{plan.name}</h3>
                  <div className="mt-4 mb-8">
                    <span className={`text-5xl font-bold ${plan.hot ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      ${(annual ? plan.annual : plan.monthly).toLocaleString()}
                    </span>
                    <span className={`text-sm ml-1 ${plan.hot ? 'text-white/40' : 'text-[#6e6e73]'}`}>/mes</span>
                  </div>
                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map(f => (
                      <li key={f} className={`flex items-center gap-3 text-sm ${plan.hot ? 'text-white/70' : 'text-[#3d3d3f]'}`}>
                        <Check className={`w-4 h-4 shrink-0 ${plan.hot ? 'text-blue-400' : 'text-[#1d1d1f]'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="mailto:demo@mediaclinic.mx"
                    className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all ${plan.hot ? 'bg-white text-[#1d1d1f] hover:bg-white/90' : 'bg-[#1d1d1f] text-white hover:bg-[#333]'}`}
                  >
                    Comenzar <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp>
            <p className="text-center text-xs text-[#6e6e73] mt-8">14 días de prueba gratuita · Sin tarjeta de crédito · Cancela cuando quieras</p>
          </FadeUp>
        </div>
      </section>

      {/* ── Final CTA — full black ── */}
      <section className="bg-[#1d1d1f] py-40 px-6 text-center">
        <FadeUp className="max-w-2xl mx-auto">
          <h2 className="text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-8">
            Moderniza tu clínica.<br />
            <span className="text-[#6e6e73]">Hoy.</span>
          </h2>
          <p className="text-[#6e6e73] text-lg mb-12 max-w-lg mx-auto leading-relaxed">
            Únete a miles de médicos en México y Latinoamérica que ya gestionan su práctica con MediaClinic.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="mailto:demo@mediaclinic.mx" className="flex items-center gap-2 bg-white text-[#1d1d1f] px-8 py-4 rounded-full font-semibold text-sm hover:bg-white/90 transition-all hover:scale-[1.02]">
              Agendar demo gratis <ArrowRight className="w-4 h-4" />
            </a>
            <Link href="/login" className="flex items-center gap-2 border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-sm hover:bg-white/8 transition-all">
              Iniciar sesión
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#1d1d1f] border-t border-white/8 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <img src="/logo_white_comp.svg" alt="MediaClinic" className="h-6 w-auto opacity-40" />
          <div className="flex flex-wrap justify-center gap-6 text-xs text-white/30">
            {['Plataforma','Precios','Privacidad','Términos','HIPAA'].map(l => <a key={l} href="#" className="hover:text-white/60 transition-colors">{l}</a>)}
            <Link href="/login" className="hover:text-white/60 transition-colors">Acceso</Link>
          </div>
          <p className="text-xs text-white/20">© 2026 MediaClinic · B2D Automation</p>
        </div>
      </footer>
    </div>
  )
}
