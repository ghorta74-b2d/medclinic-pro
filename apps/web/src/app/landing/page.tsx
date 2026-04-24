'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Check, ChevronRight, Menu, X,
  Calendar, Users, Pill, CreditCard, Bot, Video, Send,
} from 'lucide-react'

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
  { name: 'Esencial', monthly: 1299, annual: 1169, desc: 'Para médicos independientes que quieren crecer.', features: ['Agenda + confirmación WhatsApp', 'Expediente clínico completo', 'Recetas digitales', 'Hasta 2 usuarios'], hot: false },
  { name: 'Profesional', monthly: 2499, annual: 2249, desc: 'El preferido por clínicas que ya escalan.', features: ['Todo de Esencial', 'Cobros y 16 aseguradoras', 'Asistente IA 24/7', 'Hasta 5 usuarios', 'Analytics básico'], hot: true },
  { name: 'Clínica', monthly: 4999, annual: 4499, desc: 'Para grupos con múltiples médicos.', features: ['Todo de Profesional', 'Telemedicina integrada', 'Hasta 20 usuarios', 'Analytics avanzado', 'Soporte dedicado'], hot: false },
]

/* ── Page ── */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [overHero, setOverHero] = useState(true)
  const [annual, setAnnual] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

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
            <a href="#demo" className={`text-sm font-semibold px-5 py-2.5 rounded-full transition-all ${
              overHero ? 'bg-white text-black hover:bg-white/90' : 'bg-[#0071e3] text-white hover:bg-[#0077ed]'
            }`}>
              Agendar demo
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
            <a href="#demo" onClick={() => setMenuOpen(false)} className="block text-center text-sm bg-[#0071e3] text-white py-3 rounded-full font-semibold">Agendar demo</a>
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
            <a href="#demo" className="inline-flex items-center gap-1.5 bg-[#0071e3] text-white text-[17px] px-6 py-3 rounded-full hover:bg-[#0077ed] transition-colors">
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
        <div className="max-w-[980px] mx-auto">
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

          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map((plan, i) => (
              <FadeUp key={plan.name} delay={i * 80}>
                <div className={`rounded-2xl p-8 h-full flex flex-col ${plan.hot ? 'bg-[#1d1d1f]' : 'bg-[#f5f5f7]'}`}>
                  {plan.hot && <span className="text-[12px] font-medium text-[#0071e3] mb-4 block">Más popular</span>}
                  <h3 className={`text-[20px] font-semibold mb-1 ${plan.hot ? 'text-white' : 'text-[#1d1d1f]'}`}>{plan.name}</h3>
                  <p className={`text-[15px] mb-6 ${plan.hot ? 'text-white/50' : 'text-[#6e6e73]'}`}>{plan.desc}</p>
                  <div className="mb-8">
                    <span className={`text-[48px] font-semibold tabular-nums ${plan.hot ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      ${(annual ? plan.annual : plan.monthly).toLocaleString()}
                    </span>
                    <span className={`text-[15px] ml-1 ${plan.hot ? 'text-white/40' : 'text-[#6e6e73]'}`}>/mes</span>
                  </div>
                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map(f => (
                      <li key={f} className={`flex items-start gap-3 text-[15px] ${plan.hot ? 'text-white/70' : 'text-[#1d1d1f]'}`}>
                        <Check className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="mailto:demo@mediaclinic.mx"
                    className={`flex items-center justify-center py-3.5 rounded-full text-[17px] transition-colors ${plan.hot ? 'bg-[#0071e3] text-white hover:bg-[#0077ed]' : 'bg-[#1d1d1f] text-white hover:bg-black'}`}
                  >
                    Comenzar
                  </a>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp>
            <p className="text-center text-[13px] text-[#6e6e73] mt-8">14 días de prueba gratuita · Sin tarjeta de crédito · Cancela cuando quieras</p>
          </FadeUp>
        </div>
      </section>

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
