// Landing pública de Receta Electrónica — sin autenticación, mobile-first
// Vigencia: 14 días desde la generación (campo expiresAt en Prescription)
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DispensingChip, FractionLegend } from '@/components/rx-landing/fraction-legend'
import { PharmacyMap } from '@/components/rx-landing/pharmacy-map'
import { CampaignCta } from '@/components/rx-landing/campaign-cta'
import { RxActions } from '@/components/rx-landing/rx-actions'
import type { DrugFraction, PharmacyCampaign } from 'medclinic-shared'
import { getDispensingCategory, getMedicationCategory, DISPENSING_META } from 'medclinic-shared'
import { Clock, CheckCircle, AlertCircle } from 'lucide-react'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'

interface RxLandingData {
  expired: boolean
  prescription: {
    id: string
    publicSlug: string
    receiptId: string
    expiresAt: string | null
    status: string
    rxeStatus: string | null
    instructions: string | null
    followUpDate: string | null
    createdAt: string
    pdfUrl: string | null
  }
  items: Array<{
    id: string
    medicationName: string
    dose: string
    route: string
    frequency: string
    duration: string
    quantity: string | null
    instructions: string | null
    fraction: DrugFraction | null
    boughtQty: number
  }>
  patient: { firstName: string; lastName: string }
  doctor: { firstName: string; lastName: string; specialty: string | null; licenseNumber: string | null }
  clinic: { name: string; logoUrl: string | null; phone: string | null }
  campaigns: PharmacyCampaign[]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return {
    title: 'Receta Electrónica | MediaClinic',
    description: 'Tu receta médica digital. Escanea para surtir en farmacias.',
    robots: 'noindex,nofollow',
    openGraph: {
      title: 'Receta Electrónica | MediaClinic',
      description: 'Accede a tu receta médica digital.',
      url: `${APP_URL}/r/${slug}`,
    },
  }
}

async function fetchRxData(slug: string, state?: string): Promise<RxLandingData | null> {
  try {
    const qs = state ? `?state=${encodeURIComponent(state)}` : ''
    const res = await fetch(`${API_URL}/api/public/rx/${slug}${qs}`, {
      next: { revalidate: 30 }, // ISR: revalidate every 30s for impression tracking
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data as RxLandingData
  } catch {
    return null
  }
}

export default async function RxLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await fetchRxData(slug)

  if (!data) notFound()

  const { prescription, items, patient, doctor, clinic, campaigns, expired } = data
  const publicUrl = `${APP_URL}/r/${slug}`

  const expiresFormatted = prescription.expiresAt
    ? new Date(prescription.expiresAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const createdFormatted = new Date(prescription.createdAt).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {clinic.logoUrl
              ? <img src={clinic.logoUrl} alt={clinic.name} className="h-7 w-auto object-contain" />
              : <span className="text-sm font-bold text-primary">{clinic.name}</span>}
          </div>
          <span className="text-xs text-muted-foreground">Receta Electrónica</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Expiry banner */}
        {expired ? (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Esta receta ha expirado</p>
              <p className="text-xs text-muted-foreground mt-1">
                La receta electrónica estuvo disponible por 14 días. Solicita a tu médico que genere una nueva.
              </p>
            </div>
          </div>
        ) : expiresFormatted && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex gap-2 items-center">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Esta receta estará disponible hasta el <strong>{expiresFormatted}</strong>
            </p>
          </div>
        )}

        {/* Patient */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Paciente</p>
          <p className="text-lg font-bold text-foreground">
            {patient.firstName} {patient.lastName}
          </p>
        </div>

        {/* Doctor intro */}
        <div>
          <p className="text-xs text-muted-foreground">Tu médico</p>
          <p className="text-lg font-bold text-foreground">
            Dr. {doctor.firstName} {doctor.lastName}
          </p>
          {doctor.specialty && <p className="text-sm text-muted-foreground">{doctor.specialty}</p>}
          {doctor.licenseNumber && <p className="text-xs text-muted-foreground">Cédula: {doctor.licenseNumber}</p>}
          <p className="text-sm text-muted-foreground mt-2">
            te ha recetado el siguiente tratamiento:
          </p>
        </div>

        {/* Dispensing category legend (per norm) */}
        {!expired && <FractionLegend />}

        {/* Medications */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Medicamentos</h2>
          {items.map((item, i) => {
            const dispCat = getDispensingCategory(item.medicationName)
            const dispMeta = DISPENSING_META[dispCat]
            return (
            <div key={item.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.medicationName}</p>
                    <p className="text-xs text-muted-foreground">{item.dose}</p>
                  </div>
                </div>
                <DispensingChip category={dispCat} />
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5 pl-7">
                <p>{item.route} · {item.frequency} · {item.duration}</p>
                {item.quantity && <p>Cantidad: {item.quantity}</p>}
                {item.instructions && <p className="italic">{item.instructions}</p>}
                {/* Dispensing legend (per norm) */}
                <p className="text-[10px] mt-1 font-medium" style={{ color: dispMeta.color }}>
                  {dispMeta.label} · {dispMeta.rule}
                </p>
                {(() => {
                  const medCat = getMedicationCategory(item.medicationName)
                  return (medCat === 'Antibiótico' || medCat === 'Antibiótico tópico') && (
                    <p className="text-[10px] text-muted-foreground/70 italic">
                      El uso inadecuado de antibióticos genera resistencia. Úsalo solo bajo prescripción médica y completa el tratamiento.
                    </p>
                  )
                })()}
              </div>
            </div>
          )})}
        </section>

        {/* General instructions */}
        {prescription.instructions && (
          <section className="bg-muted border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Indicaciones generales</p>
            <p className="text-sm text-foreground leading-relaxed">{prescription.instructions}</p>
          </section>
        )}

        {/* Prescription status block */}
        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <p className="text-sm font-semibold text-foreground">
              {expired ? 'Receta expirada' : 'Aún puedes surtir esta receta'}
            </p>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Fecha de emisión</span>
              <span className="font-medium text-foreground">{createdFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span>ID de receta</span>
              <span className="font-mono text-foreground">{prescription.receiptId}</span>
            </div>
          </div>
          <RxActions
            receiptId={prescription.receiptId}
            publicUrl={publicUrl}
            pdfUrl={prescription.pdfUrl}
            expired={expired}
          />
        </section>

        {/* Pharmacy slots (monetization) */}
        {campaigns.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Surte tu receta ahora</h2>
            <p className="text-xs text-muted-foreground">Farmacias aliadas donde puedes surtir tu tratamiento:</p>
            <div className="space-y-3">
              {campaigns.map(c => (
                <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                  {c.pharmacy?.logoUrl && (
                    <img
                      src={c.pharmacy.logoUrl}
                      alt={c.pharmacy.name ?? c.displayName}
                      className="h-10 w-16 object-contain shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.displayName}</p>
                    {c.description && (
                      <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                    )}
                    {c.displayPhone && (
                      <p className="text-xs text-muted-foreground">{c.displayPhone}</p>
                    )}
                  </div>
                  <CampaignCta campaignId={c.id} ctaLink={c.ctaLink} ctaLabel={c.ctaLabel} rxSlug={slug} />
                </div>
              ))}
            </div>

            {/* Map with nearby branches */}
            {campaigns.some(c => (c.branches?.length ?? 0) > 0) && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Sucursales cercanas</h3>
                <PharmacyMap campaigns={campaigns} />
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer LFPDPPP */}
      <footer className="border-t border-border mt-10 py-6 px-4">
        <div className="max-w-lg mx-auto space-y-2 text-center">
          <p className="text-[11px] text-muted-foreground font-medium">
            Documento confidencial — solo para uso del paciente indicado
          </p>
          <p className="text-[10px] text-muted-foreground">
            ID de receta: <span className="font-mono">{prescription.receiptId}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            Tratamiento de datos personales con base legal en Art. 10 LFPDPPP (atención médica).{' '}
            <Link href="/privacidad" className="underline underline-offset-2">Aviso de privacidad</Link>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {clinic.name} · {clinic.phone}
          </p>
        </div>
      </footer>
    </div>
  )
}

