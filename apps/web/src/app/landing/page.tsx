'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Check, ChevronRight, Menu, X,
  Calendar, Users, Pill, CreditCard, Bot,
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
            src={overHero ? '/logo_white_comp.svg' : '/logo_mediaclinic.svg'}
            alt="MediaClinic"
            className="h-9 w-auto transition-all duration-500"
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
              overHero ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/80'
            }`}>
              Ver demo
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
            <a href="#precios" onClick={() => setMenuOpen(false)} className="block text-center text-sm bg-black text-white py-3 rounded-full font-semibold">Ver demo</a>
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
            <a href="#plataforma" className="flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-full font-semibold text-sm hover:bg-white/90 transition-all hover:scale-[1.02]">
              Descubrir la plataforma <ArrowRight className="w-4 h-4" />
            </a>
            <Link href="/login" className="flex items-center gap-2 bg-white/12 backdrop-blur text-white px-7 py-3.5 rounded-full font-semibold text-sm border border-white/20 hover:bg-white/22 transition-all">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* ── Insurers ticker ── */}
      <div className="border-b border-black/8 py-6 overflow-hidden bg-white">
        <p className="text-center text-[10px] text-black/30 uppercase tracking-[0.25em] mb-6 font-semibold">Compatible con 16 aseguradoras</p>
        <div className="flex gap-16 animate-marquee whitespace-nowrap w-max items-center">
          {[
            /* GNP */
            <svg key="gnp1" height="22" viewBox="0 0 120 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="32" fill="#003087">GNP</text></svg>,
            /* AXA */
            <svg key="axa1" height="22" viewBox="0 0 90 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="32" fill="#00008F">AXA</text></svg>,
            /* MetLife */
            <svg key="met1" height="22" viewBox="0 0 160 36" fill="none"><text x="0" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="26" fill="#0099CC">MetLife</text></svg>,
            /* Mapfre */
            <svg key="map1" height="22" viewBox="0 0 160 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="26" fill="#CC0000">MAPFRE</text></svg>,
            /* Zurich */
            <svg key="zur1" height="22" viewBox="0 0 140 36" fill="none"><text x="0" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="26" fill="#0000A0">Zurich</text></svg>,
            /* BBVA */
            <svg key="bbva1" height="22" viewBox="0 0 160 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="24" fill="#004B9E">BBVA</text></svg>,
            /* Inbursa */
            <svg key="inb1" height="22" viewBox="0 0 190 36" fill="none"><text x="0" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="24" fill="#E31837">Inbursa</text></svg>,
            /* Allianz */
            <svg key="all1" height="22" viewBox="0 0 170 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="26" fill="#003781">Allianz</text></svg>,
            /* HDI */
            <svg key="hdi1" height="22" viewBox="0 0 90 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="28" fill="#E2000F">HDI</text></svg>,
            /* Sura */
            <svg key="sur1" height="22" viewBox="0 0 120 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="28" fill="#003DA5">Sura</text></svg>,
            /* Seguros Monterrey */
            <svg key="sm1" height="22" viewBox="0 0 320 36" fill="none"><text x="0" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="22" fill="#005BAC">Seguros Monterrey</text></svg>,
            /* Insignia */
            <svg key="ins1" height="22" viewBox="0 0 200 36" fill="none"><text x="0" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="24" fill="#6B21A8">Insignia</text></svg>,
            /* duplicate set */
            <svg key="gnp2" height="22" viewBox="0 0 120 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="32" fill="#003087">GNP</text></svg>,
            <svg key="axa2" height="22" viewBox="0 0 90 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="32" fill="#00008F">AXA</text></svg>,
            <svg key="met2" height="22" viewBox="0 0 160 36" fill="none"><text x="0" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="26" fill="#0099CC">MetLife</text></svg>,
            <svg key="map2" height="22" viewBox="0 0 160 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="26" fill="#CC0000">MAPFRE</text></svg>,
            <svg key="zur2" height="22" viewBox="0 0 140 36" fill="none"><text x="0" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="26" fill="#0000A0">Zurich</text></svg>,
            <svg key="bbva2" height="22" viewBox="0 0 160 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="24" fill="#004B9E">BBVA</text></svg>,
            <svg key="inb2" height="22" viewBox="0 0 190 36" fill="none"><text x="0" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="24" fill="#E31837">Inbursa</text></svg>,
            <svg key="all2" height="22" viewBox="0 0 170 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="26" fill="#003781">Allianz</text></svg>,
            <svg key="hdi2" height="22" viewBox="0 0 90 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="28" fill="#E2000F">HDI</text></svg>,
            <svg key="sur2" height="22" viewBox="0 0 120 36" fill="none"><text x="0" y="28" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="28" fill="#003DA5">Sura</text></svg>,
            <svg key="sm2" height="22" viewBox="0 0 320 36" fill="none"><text x="0" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="22" fill="#005BAC">Seguros Monterrey</text></svg>,
            <svg key="ins2" height="22" viewBox="0 0 200 36" fill="none"><text x="0" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="24" fill="#6B21A8">Insignia</text></svg>,
          ].map((logo, i) => (
            <span key={i} className="shrink-0 opacity-60 hover:opacity-90 transition-opacity">{logo}</span>
          ))}
        </div>
      </div>

      {/* ── Statement — white, editorial ── */}
      <section className="bg-white py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-end">
            <FadeUp>
              <h2 className="text-5xl lg:text-6xl font-bold text-black leading-[1.07] tracking-tight">
                Cinco herramientas.<br />
                <span className="text-black/25">Una sola plataforma.</span>
              </h2>
            </FadeUp>
            <FadeUp delay={100}>
              <p className="text-black/55 text-lg leading-relaxed mb-8">
                MediaClinic unifica agenda, expediente clínico, recetas digitales, cobros y telemedicina — todo potenciado por un asistente de IA que trabaja 24/7 en tu nombre.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Agenda IA','Expediente','Recetas','Cobros','Telemedicina','WhatsApp','CIE-10','Aseguradoras'].map(t => (
                  <span key={t} className="text-xs font-medium px-3.5 py-1.5 rounded-full border border-black/12 text-black/50 hover:border-black/30 transition-colors cursor-default">
                    {t}
                  </span>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Features bento grid — black ── */}
      <section id="plataforma" className="bg-black py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="mb-16">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-4 font-semibold">Plataforma</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight max-w-xl">
              Todo lo que necesita tu consultorio.
            </h2>
          </FadeUp>

          {/* Row 1 */}
          <div className="grid lg:grid-cols-3 gap-4 mb-4">

            {/* Agenda — wide */}
            <FadeUp delay={0} className="lg:col-span-2 bg-[#0a0a0a] rounded-3xl border border-white/8 overflow-hidden">
              <div className="p-8 pb-0">
                <div className="flex items-center gap-3 mb-1">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <span className="text-white/40 text-xs uppercase tracking-widest font-semibold">Agenda inteligente</span>
                </div>
                <h3 className="text-2xl font-bold text-white mt-3 mb-2">Tu agenda confirma sola.</h3>
                <p className="text-white/45 text-sm leading-relaxed max-w-sm">
                  El asistente IA contacta a cada paciente por WhatsApp, confirma asistencia y gestiona reprogramaciones — sin que muevas un dedo.
                </p>
              </div>
              {/* Mini agenda mockup */}
              <div className="mx-8 mt-8 bg-[#111] rounded-t-2xl border-t border-x border-white/8 p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white text-xs font-semibold">Agenda — Hoy</span>
                  <span className="text-[10px] text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full font-medium">9 confirmadas</span>
                </div>
                <div className="space-y-2">
                  {[
                    { time: '09:00', name: 'García, Ana',    tag: '✓ IA', color: 'text-emerald-400 bg-emerald-400/10' },
                    { time: '09:30', name: 'Pérez, Luis',    tag: '✓ IA', color: 'text-emerald-400 bg-emerald-400/10' },
                    { time: '10:00', name: 'López, María',   tag: '● Pendiente', color: 'text-yellow-400 bg-yellow-400/10' },
                    { time: '10:30', name: 'Torres, Ramón',  tag: '✓ IA', color: 'text-emerald-400 bg-emerald-400/10' },
                  ].map(a => (
                    <div key={a.time} className="flex items-center gap-3 bg-white/4 rounded-xl px-3 py-2.5 border border-white/5">
                      <span className="text-white/30 text-xs font-mono w-9 shrink-0">{a.time}</span>
                      <span className="text-white/70 text-xs flex-1">{a.name}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${a.color}`}>{a.tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* IA WhatsApp — tall */}
            <FadeUp delay={80} className="bg-[#0a0a0a] rounded-3xl border border-white/8 overflow-hidden">
              <div className="p-8 pb-6">
                <div className="flex items-center gap-3 mb-1">
                  <Bot className="w-5 h-5 text-violet-400" />
                  <span className="text-white/40 text-xs uppercase tracking-widest font-semibold">Asistente IA</span>
                </div>
                <h3 className="text-2xl font-bold text-white mt-3 mb-2">24/7 sin staff.</h3>
                <p className="text-white/45 text-sm leading-relaxed">
                  Confirma, cobra y notifica mientras tú descansas.
                </p>
              </div>
              <div className="px-8 pb-8">
                {/* Mini WhatsApp */}
                <div className="bg-[#111b21] rounded-2xl overflow-hidden border border-white/8">
                  <div className="bg-[#1f2c33] px-3.5 py-2.5 flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-violet-600/80 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">MC</div>
                    <div>
                      <p className="text-white text-xs font-semibold">MediaClinic IA</p>
                      <p className="text-[#8696a0] text-[10px] flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-green-400 inline-block" />en línea
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#0b141a] px-3 py-3 space-y-2">
                    {['Hola Ana 👋 ¿Confirmas tu cita mañana a las 9 AM?', 'Sí, confirmo ✅', 'Formulario: link.mc/pre 📋'].map((m, i) => (
                      <div key={i} className={`flex ${i === 1 ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-[11px] leading-relaxed ${i === 1 ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-sm' : 'bg-[#202c33] text-[#e9edef] rounded-tl-sm'}`}>
                          {m}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {['Confirmación automática de citas','Cobros por WhatsApp','Notificación de resultados'].map(f => (
                    <div key={f} className="flex items-center gap-2.5 text-white/45 text-xs">
                      <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />{f}
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>

          {/* Row 2 */}
          <div className="grid lg:grid-cols-3 gap-4">

            {/* Expediente */}
            <FadeUp delay={0} className="bg-[#0a0a0a] rounded-3xl border border-white/8 p-8">
              <div className="flex items-center gap-3 mb-1">
                <Users className="w-5 h-5 text-emerald-400" />
                <span className="text-white/40 text-xs uppercase tracking-widest font-semibold">Expediente</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-3 mb-2">Historial completo.</h3>
              <p className="text-white/45 text-sm leading-relaxed mb-5">Notas SOAP, CIE-10, alergias y signos vitales en un solo lugar.</p>
              <div className="space-y-2">
                {[
                  { label: 'Diagnóstico', value: 'J00 · Rinofaringitis', color: 'text-white/70' },
                  { label: 'Alergias',    value: 'Penicilina',           color: 'text-red-400' },
                  { label: 'P. arterial', value: '120/80 mmHg',          color: 'text-emerald-400' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between bg-white/4 rounded-xl px-3.5 py-2.5 border border-white/5">
                    <span className="text-white/35 text-xs">{r.label}</span>
                    <span className={`text-xs font-medium ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </FadeUp>

            {/* Cobros */}
            <FadeUp delay={80} className="bg-[#0a0a0a] rounded-3xl border border-white/8 p-8">
              <div className="flex items-center gap-3 mb-1">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <span className="text-white/40 text-xs uppercase tracking-widest font-semibold">Cobros</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-3 mb-2">Cobra el 100%.</h3>
              <p className="text-white/45 text-sm leading-relaxed mb-5">Ligas de pago por WhatsApp y 16 aseguradoras integradas.</p>
              <div className="space-y-2">
                {[
                  { name: 'García, Ana',  amount: '$800',   tag: 'Pagado',    color: 'text-emerald-400 bg-emerald-400/10' },
                  { name: 'Pérez, Luis',  amount: '$1,200', tag: 'Pagado',    color: 'text-emerald-400 bg-emerald-400/10' },
                  { name: 'López, María', amount: '$700',   tag: 'Pendiente', color: 'text-yellow-400 bg-yellow-400/10' },
                ].map(p => (
                  <div key={p.name} className="flex items-center gap-3 bg-white/4 rounded-xl px-3.5 py-2.5 border border-white/5">
                    <span className="text-white/70 text-xs flex-1">{p.name}</span>
                    <span className="text-white/50 text-xs font-medium">{p.amount}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.color}`}>{p.tag}</span>
                  </div>
                ))}
              </div>
            </FadeUp>

            {/* Recetas */}
            <FadeUp delay={160} className="bg-[#0a0a0a] rounded-3xl border border-white/8 p-8">
              <div className="flex items-center gap-3 mb-1">
                <Pill className="w-5 h-5 text-blue-400" />
                <span className="text-white/40 text-xs uppercase tracking-widest font-semibold">Recetas</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-3 mb-2">Digital y firmada.</h3>
              <p className="text-white/45 text-sm leading-relaxed mb-5">Prescripciones con firma electrónica enviadas al instante por WhatsApp.</p>
              <div className="bg-white/4 rounded-2xl p-4 border border-white/5 space-y-2.5">
                {[
                  { rx: 'Amoxicilina 500mg', sig: '1 cáp. c/8h × 7 días' },
                  { rx: 'Ibuprofeno 400mg',  sig: '1 tab. c/12h · SOS' },
                  { rx: 'Loratadina 10mg',   sig: '1 tab. c/24h × 5 días' },
                ].map((r, i) => (
                  <div key={i} className="bg-white/4 rounded-xl px-3 py-2.5">
                    <p className="text-white/80 text-xs font-semibold">Rx {r.rx}</p>
                    <p className="text-white/35 text-[11px] mt-0.5">{r.sig}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[#25D366] text-xs">
                <span>💬</span><span>Enviada por WhatsApp</span>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Stats — white ── */}
      <section className="bg-white py-28 px-6 border-b border-black/8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
            {[
              { end: 2500, suffix: '+', label: 'Médicos activos',         desc: 'En México y LATAM',             color: '#2563eb' },
              { end: 60,   suffix: '%', label: 'Menos inasistencias',     desc: 'Gracias al asistente IA',       color: '#059669' },
              { end: 30,   suffix: 's', label: 'Respuesta del asistente', desc: 'Disponible las 24 horas',       color: '#7c3aed' },
              { end: 100,  suffix: '%', label: 'En la nube',              desc: 'Sin instalación ni servidores', color: '#d97706' },
            ].map((s, i) => (
              <FadeUp key={s.label} delay={i * 80} className="flex flex-col">
                <div className="text-5xl lg:text-6xl font-bold leading-none tabular-nums mb-3">
                  <Counter end={s.end} suffix={s.suffix} color={s.color} />
                </div>
                <p className="font-semibold text-sm text-black">{s.label}</p>
                <p className="text-xs text-black/40 mt-0.5">{s.desc}</p>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── IA Section — black, editorial ── */}
      <section id="ia" className="bg-black py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <FadeUp>
              <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-6">Asistente IA</p>
              <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.08] mb-8">
                Tu clínica trabaja<br />
                <span className="text-white/30">aunque no estés.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-10 max-w-md">
                Agentes de WhatsApp y voz que confirman citas, envían cobros, notifican resultados y responden preguntas — los 7 días de la semana.
              </p>
              <ul className="space-y-4">
                {[
                  'Confirmación automática de citas vía WhatsApp',
                  'Cobros y ligas de pago sin intervención humana',
                  'Notificación de resultados de laboratorio',
                  'Respuestas automáticas a preguntas frecuentes',
                  'Formularios de pre-consulta personalizados',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/50">
                    <span className="w-5 h-5 rounded-full bg-white/8 border border-white/12 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white/60" />
                    </span>
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

      {/* ── Testimonials — white ── */}
      <section className="bg-white py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="mb-16">
            <p className="text-black/35 text-xs font-semibold uppercase tracking-widest mb-4">Testimonios</p>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-black">Lo dicen los médicos.</h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { quote: 'Mis inasistencias bajaron 60% en el primer mes. El asistente de WhatsApp confirma citas mientras yo duermo.', name: 'Dr. Alejandro Reyes', role: 'Cardiólogo · Monterrey', init: 'AR' },
              { quote: 'Por fin un sistema pensado para México. Elegante, rápido y mis pacientes lo aman desde el primer día.', name: 'Dra. Fernanda Castillo', role: 'Dermatóloga · CDMX', init: 'FC' },
              { quote: 'En 2 semanas recuperé la inversión. Ahora cobro el 100% y tengo todo el historial en mi celular.', name: 'Dr. Ricardo Soto', role: 'Medicina General · Guadalajara', init: 'RS' },
            ].map((t, i) => (
              <FadeUp key={t.name} delay={i * 80}>
                <div className="bg-[#f5f5f5] rounded-3xl p-8 h-full flex flex-col hover:bg-[#f0f0f0] transition-colors duration-300">
                  <p className="text-black/70 text-[15px] leading-relaxed flex-1 mb-8">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold shrink-0">{t.init}</div>
                    <div>
                      <p className="font-semibold text-sm text-black">{t.name}</p>
                      <p className="text-xs text-black/40">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precios" className="bg-[#f5f5f5] py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <p className="text-black/35 text-xs font-semibold uppercase tracking-widest mb-4">Precios</p>
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-black">Elige tu plan.</h2>
            </div>
            <div className="inline-flex items-center gap-1 bg-black/8 rounded-full p-1">
              <button onClick={() => setAnnual(false)} className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-white shadow-sm text-black' : 'text-black/50'}`}>Mensual</button>
              <button onClick={() => setAnnual(true)} className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${annual ? 'bg-white shadow-sm text-black' : 'text-black/50'}`}>
                Anual <span className="text-xs text-emerald-600 font-bold">−10%</span>
              </button>
            </div>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map((plan, i) => (
              <FadeUp key={plan.name} delay={i * 80}>
                <div className={`rounded-3xl p-8 h-full flex flex-col transition-all duration-300 ${plan.hot ? 'bg-black text-white' : 'bg-white border border-black/8 hover:shadow-md'}`}>
                  {plan.hot && <span className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4 block">Más popular</span>}
                  <h3 className={`text-lg font-bold mb-1 ${plan.hot ? 'text-white' : 'text-black'}`}>{plan.name}</h3>
                  <p className={`text-sm mb-6 ${plan.hot ? 'text-white/40' : 'text-black/40'}`}>{plan.desc}</p>
                  <div className="mb-8">
                    <span className={`text-5xl font-bold tabular-nums ${plan.hot ? 'text-white' : 'text-black'}`}>
                      ${(annual ? plan.annual : plan.monthly).toLocaleString()}
                    </span>
                    <span className={`text-sm ml-1.5 ${plan.hot ? 'text-white/35' : 'text-black/35'}`}>/mes</span>
                  </div>
                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map(f => (
                      <li key={f} className={`flex items-center gap-3 text-sm ${plan.hot ? 'text-white/60' : 'text-black/60'}`}>
                        <Check className={`w-4 h-4 shrink-0 ${plan.hot ? 'text-blue-400' : 'text-black'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="mailto:demo@mediaclinic.mx"
                    className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all ${plan.hot ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/80'}`}
                  >
                    Comenzar <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp>
            <p className="text-center text-xs text-black/35 mt-8">14 días de prueba gratuita · Sin tarjeta de crédito · Cancela cuando quieras</p>
          </FadeUp>
        </div>
      </section>

      {/* ── Final CTA — black ── */}
      <section className="bg-black py-40 px-6 text-center">
        <FadeUp className="max-w-2xl mx-auto">
          <h2 className="text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.07] mb-8">
            Moderniza tu clínica.<br />
            <span className="text-white/25">Empieza hoy.</span>
          </h2>
          <p className="text-white/40 text-lg mb-12 max-w-md mx-auto leading-relaxed">
            Únete a miles de médicos en México y LATAM que ya gestionan su práctica con MediaClinic.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="mailto:demo@mediaclinic.mx" className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-semibold text-sm hover:bg-white/90 transition-all hover:scale-[1.02]">
              Agendar demo gratis <ArrowRight className="w-4 h-4" />
            </a>
            <Link href="/login" className="flex items-center gap-2 border border-white/15 text-white/70 px-8 py-4 rounded-full font-semibold text-sm hover:bg-white/6 transition-all">
              Iniciar sesión
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-black border-t border-white/8 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <img src="/logo_white_comp.svg" alt="MediaClinic" className="h-7 w-auto opacity-30" />
          <div className="flex flex-wrap justify-center gap-6 text-xs text-white/25">
            {['Plataforma','Precios','Privacidad','Términos','HIPAA'].map(l => <a key={l} href="#" className="hover:text-white/50 transition-colors">{l}</a>)}
            <Link href="/login" className="hover:text-white/50 transition-colors">Acceso</Link>
          </div>
          <p className="text-xs text-white/20">© 2026 MediaClinic · B2D Automation</p>
        </div>
      </footer>
    </div>
  )
}
