'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Loader2, Plus, Building2, Megaphone, BarChart3, ToggleLeft, ToggleRight, Pencil, Trash2 } from 'lucide-react'
import type { PharmacyCampaign } from 'medclinic-shared'

type Tab = 'farmacias' | 'campanas' | 'metricas'

interface Pharmacy {
  id: string
  name: string
  logoUrl?: string
  websiteUrl?: string
  active: boolean
  campaigns: Pick<PharmacyCampaign, 'id' | 'displayName' | 'active' | 'impressions' | 'clicks'>[]
}

export default function FarmaciasAdminPage() {
  const [tab, setTab] = useState<Tab>('farmacias')
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [campaigns, setCampaigns] = useState<PharmacyCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewPharmacy, setShowNewPharmacy] = useState(false)
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [editingPharmacy, setEditingPharmacy] = useState<Pharmacy | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<PharmacyCampaign | null>(null)

  async function handleDeletePharmacy(ph: Pharmacy) {
    if (!confirm(`¿Eliminar "${ph.name}"? Se borrarán también sus campañas. Esta acción no se puede deshacer.`)) return
    try {
      await api.pharmacies.delete(ph.id)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  async function handleDeleteCampaign(c: PharmacyCampaign) {
    if (!confirm(`¿Eliminar campaña "${c.displayName}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.pharmacies.campaigns.delete(c.id)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [phRes, cpRes] = await Promise.all([
        api.pharmacies.list() as Promise<{ data: Pharmacy[] }>,
        api.pharmacies.campaigns.list() as Promise<{ data: PharmacyCampaign[] }>,
      ])
      setPharmacies(phRes.data)
      setCampaigns(cpRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'farmacias', label: 'Farmacias', icon: Building2 },
    { id: 'campanas', label: 'Campañas', icon: Megaphone },
    { id: 'metricas', label: 'Métricas', icon: BarChart3 },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Farmacias &amp; Campañas</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión global de espacios publicitarios en recetas electrónicas — MedClinic Pro</p>
        </div>
        {tab === 'farmacias' ? (
          <button
            onClick={() => setShowNewPharmacy(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva farmacia
          </button>
        ) : tab === 'campanas' ? (
          <button
            onClick={() => setShowNewCampaign(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva campaña
          </button>
        ) : null}
      </div>

      <div>
        {/* Tabs */}
        <div className="flex border-b border-border mb-6 gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {tab === 'farmacias' && (
              <div className="space-y-3 max-w-3xl">
                {pharmacies.length === 0 ? (
                  <EmptyState icon={Building2} message="No hay farmacias registradas" />
                ) : pharmacies.map(ph => (
                  <div key={ph.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {ph.logoUrl
                          ? <img src={ph.logoUrl} alt={ph.name} className="h-8 w-14 object-contain" />
                          : <div className="h-8 w-14 bg-muted rounded flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                            </div>}
                        <div>
                          <p className="text-sm font-semibold text-foreground">{ph.name}</p>
                          {ph.websiteUrl && (
                            <a href={ph.websiteUrl} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline">{ph.websiteUrl}</a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ph.active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        }`}>
                          {ph.active ? 'Activa' : 'Inactiva'}
                        </span>
                        <button onClick={() => setEditingPharmacy(ph)} title="Editar"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeletePharmacy(ph)} title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Megaphone className="w-3.5 h-3.5" />
                      {ph.campaigns.length} campaña{ph.campaigns.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'campanas' && (
              <div className="space-y-3 max-w-3xl">
                {campaigns.length === 0 ? (
                  <EmptyState icon={Megaphone} message="No hay campañas registradas" />
                ) : campaigns.map(c => (
                  <div key={c.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.displayName}</p>
                        <p className="text-xs text-muted-foreground">{c.pharmacy?.name}</p>
                        {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.active
                          ? <ToggleRight className="w-5 h-5 text-success" />
                          : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                        <span className={`text-xs font-medium ${c.active ? 'text-success' : 'text-muted-foreground'}`}>
                          {c.active ? 'Activa' : 'Pausada'}
                        </span>
                        <button onClick={() => setEditingCampaign(c)} title="Editar"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteCampaign(c)} title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <MetricCell label="Impresiones" value={c.impressions.toLocaleString()} />
                      <MetricCell label="Clics" value={c.clicks.toLocaleString()} />
                      <MetricCell label="CTR" value={
                        c.impressions > 0 ? `${((c.clicks / c.impressions) * 100).toFixed(1)}%` : '—'
                      } />
                    </div>
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {c.geoStates.length === 0 ? 'Nacional' : c.geoStates.join(', ')}
                      </span>
                      <span className="font-mono text-foreground/70">
                        {c.pricingModel} · ${(c.rateCents / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'metricas' && (
              <div className="max-w-3xl">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <SummaryCard
                    label="Impresiones totales"
                    value={campaigns.reduce((s, c) => s + c.impressions, 0).toLocaleString()}
                  />
                  <SummaryCard
                    label="Clics totales"
                    value={campaigns.reduce((s, c) => s + c.clicks, 0).toLocaleString()}
                  />
                  <SummaryCard
                    label="CTR promedio"
                    value={(() => {
                      const imp = campaigns.reduce((s, c) => s + c.impressions, 0)
                      const clk = campaigns.reduce((s, c) => s + c.clicks, 0)
                      return imp > 0 ? `${((clk / imp) * 100).toFixed(1)}%` : '—'
                    })()}
                  />
                  <SummaryCard
                    label="Campañas activas"
                    value={campaigns.filter(c => c.active).length.toString()}
                  />
                </div>
                {campaigns.map(c => (
                  <div key={c.id} className="bg-card border border-border rounded-xl p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-foreground">{c.displayName}</p>
                      <span className="text-xs text-muted-foreground">{c.pharmacy?.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <MetricCell label="Impresiones" value={c.impressions.toLocaleString()} />
                      <MetricCell label="Clics" value={c.clicks.toLocaleString()} />
                      <MetricCell label="CTR" value={
                        c.impressions > 0 ? `${((c.clicks / c.impressions) * 100).toFixed(1)}%` : '—'
                      } />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* New Pharmacy form (simplified modal) */}
      {showNewPharmacy && (
        <NewPharmacyModal onClose={() => setShowNewPharmacy(false)} onCreated={loadData} />
      )}

      {/* New Campaign form */}
      {showNewCampaign && (
        <NewCampaignModal
          pharmacies={pharmacies}
          onClose={() => setShowNewCampaign(false)}
          onCreated={loadData}
        />
      )}

      {/* Edit Pharmacy */}
      {editingPharmacy && (
        <EditPharmacyModal
          pharmacy={editingPharmacy}
          onClose={() => setEditingPharmacy(null)}
          onSaved={loadData}
        />
      )}

      {/* Edit Campaign */}
      {editingCampaign && (
        <EditCampaignModal
          campaign={editingCampaign}
          pharmacies={pharmacies}
          onClose={() => setEditingCampaign(null)}
          onSaved={loadData}
        />
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="text-center py-16 bg-card rounded-xl border border-border">
      <Icon className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  )
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-lg p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  )
}

function NewPharmacyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.pharmacies.create({ name, logoUrl: logoUrl || undefined, websiteUrl: websiteUrl || undefined })
      onCreated()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-sm font-semibold text-foreground mb-4">Nueva farmacia</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Nombre *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">URL del logo</label>
            <input
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Sitio web</label>
            <input
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit Pharmacy Modal ─────────────────────────────────────
function EditPharmacyModal({ pharmacy, onClose, onSaved }: {
  pharmacy: Pharmacy
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(pharmacy.name)
  const [logoUrl, setLogoUrl] = useState(pharmacy.logoUrl ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(pharmacy.websiteUrl ?? '')
  const [active, setActive] = useState(pharmacy.active)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.pharmacies.update(pharmacy.id, {
        name,
        logoUrl: logoUrl || undefined,
        websiteUrl: websiteUrl || undefined,
        active,
      })
      onSaved()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-sm font-semibold text-foreground mb-4">Editar farmacia</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">URL del logo</label>
            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Sitio web</label>
            <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ph-active" checked={active} onChange={e => setActive(e.target.checked)}
              className="w-4 h-4 accent-primary" />
            <label htmlFor="ph-active" className="text-xs text-muted-foreground">Activa</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit Campaign Modal ─────────────────────────────────────
function EditCampaignModal({ campaign, pharmacies, onClose, onSaved }: {
  campaign: PharmacyCampaign
  pharmacies: Pharmacy[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    pharmacyId: campaign.pharmacyId,
    displayName: campaign.displayName,
    description: campaign.description ?? '',
    searchQuery: campaign.searchQuery ?? '',
    ctaLink: campaign.ctaLink,
    ctaLabel: campaign.ctaLabel,
    displayPhone: campaign.displayPhone ?? '',
    priority: campaign.priority,
    geoStates: campaign.geoStates,
    pricingModel: campaign.pricingModel as 'CPM' | 'CPC' | 'FLAT_MONTHLY',
    rateCents: campaign.rateCents / 100,
    active: campaign.active,
    startsAt: campaign.startsAt ? campaign.startsAt.slice(0, 10) : '',
    endsAt: campaign.endsAt ? campaign.endsAt.slice(0, 10) : '',
  })
  const [saving, setSaving] = useState(false)

  function toggleState(s: string) {
    setForm(f => ({
      ...f,
      geoStates: f.geoStates.includes(s) ? f.geoStates.filter(x => x !== s) : [...f.geoStates, s],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.pharmacies.campaigns.update(campaign.id, {
        ...form,
        rateCents: Math.round(form.rateCents * 100),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      })
      onSaved()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-xl my-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Editar campaña</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Farmacia *</label>
              <select value={form.pharmacyId} onChange={e => setForm(f => ({ ...f, pharmacyId: e.target.value }))} required className={inp}>
                {pharmacies.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Nombre del slot *</label>
              <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} required className={inp} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Descripción</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inp} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">
                Búsqueda Google Maps <span className="text-primary">(nombre de cadena)</span>
              </label>
              <input value={form.searchQuery} onChange={e => setForm(f => ({ ...f, searchQuery: e.target.value }))}
                placeholder="Ej: Farmacias del Ahorro" className={inp} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">URL de destino (CTA) *</label>
              <input value={form.ctaLink} onChange={e => setForm(f => ({ ...f, ctaLink: e.target.value }))} required placeholder="https://..." className={inp} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Texto del botón</label>
              <input value={form.ctaLabel} onChange={e => setForm(f => ({ ...f, ctaLabel: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Prioridad</label>
              <input type="number" min={0} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Modelo de cobro</label>
              <select value={form.pricingModel} onChange={e => setForm(f => ({ ...f, pricingModel: e.target.value as 'CPM'|'CPC'|'FLAT_MONTHLY' }))} className={inp}>
                <option value="FLAT_MONTHLY">Mensual fijo</option>
                <option value="CPM">CPM</option>
                <option value="CPC">CPC</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tarifa (MXN)</label>
              <input type="number" min={0} step="0.01" value={form.rateCents} onChange={e => setForm(f => ({ ...f, rateCents: Number(e.target.value) }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Inicio</label>
              <input type="date" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Fin</label>
              <input type="date" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} className={inp} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="cp-active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                className="w-4 h-4 accent-primary" />
              <label htmlFor="cp-active" className="text-xs text-muted-foreground">Campaña activa</label>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Estados (vacío = nacional)</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {MX_STATES.map(s => (
                <button key={s} type="button" onClick={() => toggleState(s)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-mono transition-colors ${
                    form.geoStates.includes(s)
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}>
                  {s.replace('MX-', '')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const MX_STATES = [
  'MX-AGU','MX-BCN','MX-BCS','MX-CAM','MX-CHP','MX-CHH','MX-CMX','MX-COA',
  'MX-COL','MX-DUR','MX-GRO','MX-GUA','MX-HID','MX-JAL','MX-MEX','MX-MIC',
  'MX-MOR','MX-NAY','MX-NLE','MX-OAX','MX-PUE','MX-QUE','MX-ROO','MX-SIN',
  'MX-SLP','MX-SON','MX-TAB','MX-TAM','MX-TLA','MX-VER','MX-YUC','MX-ZAC',
]

function NewCampaignModal({ pharmacies, onClose, onCreated }: {
  pharmacies: Pharmacy[]
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    pharmacyId: pharmacies[0]?.id ?? '',
    displayName: '',
    description: '',
    searchQuery: '',
    ctaLink: '',
    ctaLabel: 'Comprar',
    displayPhone: '',
    priority: 0,
    geoStates: [] as string[],
    pricingModel: 'FLAT_MONTHLY' as 'CPM' | 'CPC' | 'FLAT_MONTHLY',
    rateCents: 0,
    startsAt: '',
    endsAt: '',
  })
  const [saving, setSaving] = useState(false)

  function toggleState(s: string) {
    setForm(f => ({
      ...f,
      geoStates: f.geoStates.includes(s) ? f.geoStates.filter(x => x !== s) : [...f.geoStates, s],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.pharmacies.campaigns.create({
        ...form,
        rateCents: Math.round(form.rateCents * 100),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      })
      onCreated()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-xl my-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Nueva campaña</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Farmacia *</label>
              <select
                value={form.pharmacyId}
                onChange={e => setForm(f => ({ ...f, pharmacyId: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
              >
                {pharmacies.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Nombre del slot *</label>
              <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} required
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Descripción</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">
                Búsqueda Google Maps <span className="text-primary">(nombre de cadena para localizar sucursales)</span>
              </label>
              <input
                value={form.searchQuery}
                onChange={e => setForm(f => ({ ...f, searchQuery: e.target.value }))}
                placeholder="Ej: Farmacias del Ahorro"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                El paciente verá automáticamente las sucursales de esta cadena más cercanas a su ubicación.
              </p>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">URL de destino (CTA) *</label>
              <input value={form.ctaLink} onChange={e => setForm(f => ({ ...f, ctaLink: e.target.value }))} required
                placeholder="https://..." className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Texto del botón</label>
              <input value={form.ctaLabel} onChange={e => setForm(f => ({ ...f, ctaLabel: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Prioridad</label>
              <input type="number" min={0} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Modelo de cobro</label>
              <select value={form.pricingModel} onChange={e => setForm(f => ({ ...f, pricingModel: e.target.value as 'CPM'|'CPC'|'FLAT_MONTHLY' }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none">
                <option value="FLAT_MONTHLY">Mensual fijo</option>
                <option value="CPM">CPM</option>
                <option value="CPC">CPC</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tarifa (MXN)</label>
              <input type="number" min={0} step="0.01" value={form.rateCents} onChange={e => setForm(f => ({ ...f, rateCents: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Inicio</label>
              <input type="date" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Fin</label>
              <input type="date" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          {/* Geo states */}
          <div>
            <label className="text-xs text-muted-foreground block mb-2">
              Estados (vacío = nacional)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {MX_STATES.map(s => (
                <button key={s} type="button" onClick={() => toggleState(s)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-mono transition-colors ${
                    form.geoStates.includes(s)
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}>
                  {s.replace('MX-', '')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Crear campaña
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
