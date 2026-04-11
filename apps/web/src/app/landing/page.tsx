'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Calendar, Users, FileText, Pill, FlaskConical, CreditCard,
  Video, Bot, Check, ArrowRight, Star, Menu, X, Zap, Shield,
} from 'lucide-react'

/* ─── Intersection Observer hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ─── Animated counter ─── */
function Counter({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) {
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
    const step = () => {
      cur += end / 55
      if (cur >= end) { setVal(end); return }
      setVal(Math.floor(cur)); raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [started, end])
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>
}

/* ─── WhatsApp animated demo ─── */
function WhatsAppDemo() {
  const [step, setStep] = useState(0)
  const msgs = [
    { side: 'left',  text: 'Hola Ana 👋 Te recordamos tu cita mañana a las 9:00 AM con la Dra. López. ¿Confirmas tu asistencia?' },
    { side: 'right', text: 'Sí, confirmo ✅' },
    { side: 'left',  text: '¡Perfecto! Tu cita está confirmada. Te enviamos tu formulario de pre-consulta 📋' },
    { side: 'left',  text: 'Recuerda llegar 10 min antes. ¿Tienes alguna duda? 😊' },
  ]
  const delays = [900, 1600, 1800, 1800]

  useEffect(() => {
    if (step >= msgs.length) return
    const t = setTimeout(() => setStep(s => s + 1), delays[step])
    return () => clearTimeout(t)
  }, [step])

  useEffect(() => {
    const t = setInterval(() => setStep(0), 11000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="bg-[#111b21] rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-w-xs mx-auto lg:mx-0">
      <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <div className="w-9 h-9 bg-[#4E2DD2] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">MC</div>
        <div>
          <p className="text-white text-sm font-semibold">MediaClinic IA</p>
          <p className="text-[#8696a0] text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
            en línea
          </p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 min-h-[260px]">
        {msgs.slice(0, step).map((m, i) => (
          <div key={i} className={`flex ${m.side === 'right' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
              m.side === 'left'
                ? 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                : 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {step < msgs.length && (
          <div className="flex justify-start">
            <div className="bg-[#202c33] px-4 py-3 rounded-2xl rounded-tl-none">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map(d => (
                  <div key={d} className="w-1.5 h-1.5 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#202c33]/60 border-t border-white/5 px-4 py-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
        <span className="text-[#8696a0] text-xs">Asistente IA · 3 confirmaciones en la última hora</span>
      </div>
    </div>
  )
}

/* ─── Data ─── */
const MODULES = [
  { icon: Calendar,    title: 'Agenda inteligente',   desc: 'Confirmación automática por WhatsApp. Reduce inasistencias hasta 60% sin levantar el teléfono.',      color: 'from-blue-500 to-blue-600' },
  { icon: Users,       title: 'Expediente digital',   desc: 'Historial completo, alergias, antecedentes y línea de tiempo. Accesible desde cualquier dispositivo.',   color: 'from-violet-500 to-violet-600' },
  { icon: FileText,    title: 'Notas clínicas SOAP',  desc: 'Plantillas por especialidad, CIE-10, signos vitales y diagnósticos estructurados en segundos.',          color: 'from-indigo-500 to-indigo-600' },
  { icon: Pill,        title: 'Recetas digitales',    desc: 'Prescripciones con firma digital enviadas al instante por WhatsApp. Sin papel, sin errores.',             color: 'from-emerald-500 to-emerald-600' },
  { icon: FlaskConical,title: 'Resultados y estudios',desc: 'Laboratorio, imagenología y patología centralizados. La IA analiza y alerta automáticamente.',            color: 'from-cyan-500 to-cyan-600' },
  { icon: CreditCard,  title: 'Cobros y facturación', desc: 'Ligas de pago, control de saldos, 16 aseguradoras y desglose por concepto. Cobra el 100% de tus consultas.',color: 'from-orange-500 to-orange-600' },
  { icon: Video,       title: 'Telemedicina',         desc: 'Videoconsultas con notas en tiempo real, consentimiento informado y grabación integrada.',                color: 'from-pink-500 to-pink-600' },
  { icon: Bot,         title: 'Asistente IA 24/7',   desc: 'Agentes de WhatsApp y voz que confirman citas, cobran pagos y responden preguntas mientras duermes.',      color: 'from-purple-500 to-purple-600' },
]

const TESTIMONIALS = [
  {
    quote: 'Mis inasistencias bajaron 60% en el primer mes. El asistente de WhatsApp confirma citas mientras yo duermo. Increíble.',
    name: 'Dr. Alejandro Reyes', role: 'Cardiólogo · Monterrey', initial: 'AR', color: 'bg-blue-500',
  },
  {
    quote: 'Por fin un sistema pensado para México. Elegante, rápido y mis pacientes lo aman. El expediente clínico es brutalmente intuitivo.',
    name: 'Dra. Fernanda Castillo', role: 'Dermatóloga · CDMX', initial: 'FC', color: 'bg-violet-500',
  },
  {
    quote: 'En 2 semanas recuperé la inversión. Ahora cobro el 100% de mis consultas y tengo el historial clínico en mi celular.',
    name: 'Dr. Ricardo Soto', role: 'Medicina General · Guadalajara', initial: 'RS', color: 'bg-emerald-500',
  },
]

const PLANS = [
  {
    name: 'Esencial', monthly: 1299, annual: 1169,
    desc: 'Para consultorios independientes',
    features: ['Agenda inteligente', 'Expediente clínico', 'Recetas digitales', 'Hasta 2 usuarios', 'Soporte por email'],
    cta: 'Comenzar gratis', hot: false,
  },
  {
    name: 'Profesional', monthly: 2499, annual: 2249,
    desc: 'El favorito de los médicos',
    features: ['Todo de Esencial', 'Cobros y facturación', 'Asistente IA WhatsApp', 'Hasta 5 usuarios', 'Soporte prioritario'],
    cta: 'Comenzar gratis', hot: true,
  },
  {
    name: 'Clínica', monthly: 4999, annual: 4499,
    desc: 'Para grupos médicos y clínicas',
    features: ['Todo de Profesional', 'Telemedicina integrada', 'Hasta 20 usuarios', 'Dashboard analytics', 'Soporte dedicado'],
    cta: 'Contactar ventas', hot: false,
  },
]

const INSURERS = ['GNP Seguros', 'AXA', 'Metlife', 'Seguros Monterrey', 'Mapfre', 'Zurich', 'BBVA Seguros', 'Inbursa']

/* ─── Page ─── */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [annual, setAnnual] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const featuresRef = useInView()
  const testiRef    = useInView()
  const pricingRef  = useInView()

  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src="/logo_final.png" alt="MediaClinic" className={`h-8 w-auto transition-all ${scrolled ? '' : 'brightness-0 invert'}`} />

          <div className="hidden md:flex items-center gap-8 text-sm">
            {[['#plataforma','Plataforma'],['#ia','IA'],['#testimonios','Testimonios'],['#precios','Precios']].map(([href, label]) => (
              <a key={href} href={href} className={`transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}>{label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className={`text-sm px-4 py-2 rounded-lg transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}>
              Iniciar sesión
            </Link>
            <a href="#precios" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md shadow-blue-500/20">
              Ver demo gratis
            </a>
          </div>

          <button onClick={() => setMenuOpen(o => !o)} className={`md:hidden p-2 ${scrolled ? 'text-gray-700' : 'text-white'}`}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t px-6 py-5 space-y-4 shadow-lg">
            {[['#plataforma','Plataforma'],['#ia','IA'],['#testimonios','Testimonios'],['#precios','Precios']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600 hover:text-gray-900">{label}</a>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-600 hover:text-gray-900">Iniciar sesión</Link>
            <a href="#precios" onClick={() => setMenuOpen(false)} className="block text-sm bg-blue-600 text-white px-4 py-2.5 rounded-lg text-center font-medium">Ver demo gratis</a>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen bg-gradient-to-br from-[#08051a] via-[#120d35] to-[#1e1650] flex items-center overflow-hidden pt-16">
        {/* Glow orbs */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/5 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 py-28 grid lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/8 backdrop-blur-sm px-4 py-2 rounded-full border border-white/15 text-sm text-white/70">
              <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              IA nativa · Diseñado para Latinoamérica
            </div>

            <h1 className="text-5xl lg:text-[3.8rem] font-extrabold text-white leading-[1.08] tracking-tight">
              La clínica del futuro,{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                disponible hoy.
              </span>
            </h1>

            <p className="text-lg text-white/60 leading-relaxed max-w-lg">
              Automatiza confirmaciones, gestiona expedientes y cobra sin esfuerzo.
              Tu asistente IA trabaja <span className="text-white font-medium">24/7</span> para que tú te enfoques en lo que importa:{' '}
              <span className="text-white font-medium">tus pacientes.</span>
            </p>

            <div className="flex flex-wrap gap-4 pt-1">
              <a
                href="#precios"
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white px-7 py-3.5 rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30 text-sm"
              >
                Agendar demo gratis <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/login"
                className="flex items-center gap-2 bg-white/8 backdrop-blur-sm hover:bg-white/15 text-white px-7 py-3.5 rounded-xl font-semibold border border-white/20 transition-all text-sm"
              >
                Iniciar sesión
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-white/10">
              {[
                { end: 2500, suffix: '+', label: 'Médicos activos' },
                { end: 60,   suffix: '%', label: 'Menos inasistencias' },
                { end: 30,   suffix: 's', label: 'Respuesta IA' },
                { end: 0,    suffix: '',  label: '4.9 ★ satisfacción', fixed: '4.9★' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {s.fixed ? s.fixed : <Counter end={s.end} suffix={s.suffix} />}
                  </div>
                  <div className="text-xs text-white/40 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — dashboard mockup */}
          <div className="hidden lg:block relative animate-float">
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
              {/* Browser bar */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-3 h-3 rounded-full bg-red-400/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
                <div className="w-3 h-3 rounded-full bg-green-400/50" />
                <div className="flex-1 bg-white/8 rounded-md h-5 mx-4 flex items-center px-3">
                  <span className="text-white/30 text-xs">app.mediaclinic.mx/dashboard</span>
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  { label: 'Citas hoy',       value: '12',    color: 'text-blue-400',    bg: 'bg-blue-500/10' },
                  { label: 'Ingresos del día', value: '$8,400',color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Confirmadas IA',   value: '9/12',  color: 'text-violet-400',  bg: 'bg-violet-500/10' },
                  { label: 'Por cobrar',       value: '$2,100',color: 'text-orange-400',  bg: 'bg-orange-500/10' },
                ].map((c) => (
                  <div key={c.label} className={`${c.bg} rounded-xl p-3.5 border border-white/5`}>
                    <div className="text-xs text-white/40 mb-1">{c.label}</div>
                    <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
                  </div>
                ))}
              </div>

              {/* Appointments list */}
              <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                <div className="text-xs text-white/40 mb-3 font-medium uppercase tracking-wide">Próximas consultas</div>
                {[
                  { time: '09:00', patient: 'Pérez, Juan',       doctor: 'Dra. López',   status: 'confirmed' },
                  { time: '09:30', patient: 'Martínez, Ana',      doctor: 'Dr. García',   status: 'confirmed' },
                  { time: '10:00', patient: 'Rodríguez, Luis',    doctor: 'Dra. López',   status: 'pending' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className="text-xs text-white/40 font-mono w-10 shrink-0">{item.time}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-xs text-white/70 flex-1">{item.patient}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {item.status === 'confirmed' ? '✓ Confirmada' : '● Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating pill — WhatsApp notification */}
            <div className="absolute -bottom-5 -left-6 bg-white rounded-2xl shadow-2xl p-3 flex items-center gap-3 border border-gray-100 animate-float" style={{ animationDelay: '0.5s' }}>
              <div className="w-9 h-9 bg-[#25D366] rounded-xl flex items-center justify-center text-white text-base shrink-0">💬</div>
              <div>
                <p className="text-xs font-semibold text-gray-800">Cita confirmada por IA</p>
                <p className="text-xs text-gray-400">Hace 2 min · WhatsApp</p>
              </div>
            </div>

            {/* Floating pill — payment */}
            <div className="absolute -top-5 -right-6 bg-white rounded-2xl shadow-2xl p-3 flex items-center gap-3 border border-gray-100 animate-float" style={{ animationDelay: '1.2s' }}>
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 text-base shrink-0">💳</div>
              <div>
                <p className="text-xs font-semibold text-gray-800">Cobro recibido</p>
                <p className="text-xs text-gray-400">$700 MXN · BBVA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Insurer marquee ── */}
      <div className="bg-gray-50 border-y border-gray-100 py-8 overflow-hidden">
        <p className="text-center text-[11px] text-gray-400 uppercase tracking-[0.2em] mb-5">Compatible con las principales aseguradoras</p>
        <div className="flex gap-14 animate-marquee whitespace-nowrap w-max">
          {[...INSURERS, ...INSURERS, ...INSURERS].map((ins, i) => (
            <span key={i} className="text-gray-400 font-semibold text-sm shrink-0 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-gray-300" />{ins}
            </span>
          ))}
        </div>
      </div>

      {/* ── Modules / Features ── */}
      <section id="plataforma" className="py-28 max-w-7xl mx-auto px-6">
        <div ref={featuresRef.ref} className={`transition-all duration-700 ${featuresRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Plataforma integral</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mt-3 mb-4 tracking-tight">8 módulos. Una sola plataforma.</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Olvídate de usar 5 herramientas distintas. Todo integrado, todo sincronizado, todo tuyo desde el día uno.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULES.map((mod, i) => {
              const Icon = mod.icon
              return (
                <div
                  key={mod.title}
                  className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-default"
                  style={{ transitionDelay: `${i * 40}ms` }}
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-sm">{mod.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{mod.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── IA Section ── */}
      <section id="ia" className="bg-gradient-to-br from-[#08051a] via-[#120d35] to-[#1e1650] py-28 relative overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Diferenciador clave</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white mt-3 mb-6 leading-tight tracking-tight">
              Tu clínica funciona<br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                aunque no estés.
              </span>
            </h2>
            <p className="text-white/60 text-lg mb-10 leading-relaxed">
              Nuestros agentes de WhatsApp y voz confirman citas, cobran pagos,
              notifican resultados y responden preguntas — las 24 horas, los 7 días.
              Sin intervención humana.
            </p>
            <ul className="space-y-4">
              {[
                'Confirmación automática de citas por WhatsApp',
                'Cobros y ligas de pago sin intervención del staff',
                'Notificación de resultados en tiempo real',
                'Responde preguntas de horarios y servicios 24/7',
                'Reducción de inasistencias hasta 60%',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-white/70 text-sm">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-blue-400" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <WhatsAppDemo />
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonios" className="py-28 bg-gray-50/50">
        <div ref={testiRef.ref} className={`max-w-7xl mx-auto px-6 transition-all duration-700 ${testiRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Testimonios</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mt-3 tracking-tight">Lo que dicen nuestros médicos</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed flex-1 mb-6 text-sm">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {t.initial}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precios" className="py-28 max-w-7xl mx-auto px-6">
        <div ref={pricingRef.ref} className={`transition-all duration-700 ${pricingRef.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Precios</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold mt-3 mb-4 tracking-tight">Planes a la medida</h2>
            <p className="text-gray-400 mb-8">Sin contratos. Sin sorpresas. Cancela cuando quieras.</p>

            <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1.5">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!annual ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Mensual
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Anual
                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">-10%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 border transition-all duration-300 hover:-translate-y-1 ${
                  plan.hot
                    ? 'bg-gradient-to-b from-[#1a1245] to-[#0d0a2e] text-white border-transparent shadow-2xl shadow-[#4E2DD2]/30 md:scale-105'
                    : 'bg-white border-gray-200 hover:shadow-lg'
                }`}
              >
                {plan.hot && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg">
                      MÁS POPULAR
                    </span>
                  </div>
                )}

                <h3 className={`text-xl font-extrabold mb-1 ${plan.hot ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                <p className={`text-sm mb-6 ${plan.hot ? 'text-white/50' : 'text-gray-400'}`}>{plan.desc}</p>

                <div className="mb-7">
                  <span className={`text-5xl font-extrabold ${plan.hot ? 'text-white' : 'text-gray-900'}`}>
                    ${(annual ? plan.annual : plan.monthly).toLocaleString()}
                  </span>
                  <span className={`text-sm ml-1.5 ${plan.hot ? 'text-white/50' : 'text-gray-400'}`}>/mes</span>
                  {annual && <span className="ml-2 text-xs text-emerald-400 font-semibold">Ahorra ${((plan.monthly - plan.annual) * 12).toLocaleString()}/año</span>}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-3 text-sm ${plan.hot ? 'text-white/75' : 'text-gray-600'}`}>
                      <Check className={`w-4 h-4 shrink-0 ${plan.hot ? 'text-cyan-400' : 'text-blue-600'}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href="mailto:demo@mediaclinic.mx"
                  className={`block text-center py-3.5 rounded-xl font-bold text-sm transition-all ${
                    plan.hot
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:opacity-90 hover:scale-[1.02] shadow-lg shadow-blue-500/30'
                      : 'bg-gray-900 text-white hover:bg-gray-700'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            💡 Todos los planes incluyen 14 días de prueba gratuita · Sin tarjeta de crédito
          </p>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="bg-gradient-to-br from-[#08051a] via-[#120d35] to-[#1e1650] py-28 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-5 tracking-tight">
            Moderniza tu clínica.<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Hoy.</span>
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
            Únete a miles de médicos en México y Latinoamérica que ya gestionan su práctica con MediaClinic.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="mailto:demo@mediaclinic.mx"
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white px-8 py-4 rounded-xl font-bold transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30"
            >
              Agendar demo gratis <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/login"
              className="flex items-center gap-2 bg-white/8 backdrop-blur hover:bg-white/15 text-white px-8 py-4 rounded-xl font-bold border border-white/20 transition-all"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#050310] text-white/30 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <img src="/logo_white_comp.svg" alt="MediaClinic" className="h-7 w-auto opacity-50" />
          <div className="flex flex-wrap justify-center gap-6 text-xs">
            {['Plataforma', 'Precios', 'Privacidad', 'Términos', 'HIPAA'].map(l => (
              <a key={l} href="#" className="hover:text-white/70 transition-colors">{l}</a>
            ))}
            <Link href="/login" className="hover:text-white/70 transition-colors">Acceso</Link>
          </div>
          <p className="text-xs">© 2026 MediaClinic · Powered by B2D Automation</p>
        </div>
      </footer>
    </div>
  )
}
