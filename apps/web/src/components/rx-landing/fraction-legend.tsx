import type { DrugFraction } from 'medclinic-shared'
import { FRACTION_COLORS, FRACTION_LABELS } from 'medclinic-shared'

const FRACTION_DESCRIPTION: Record<DrugFraction, string> = {
  I:   'Solo con permiso especial de la Secretaría de Salud.',
  II:  'Receta retenida en farmacia. Solo se surte 1 vez (30 días de vigencia).',
  III: 'Receta sellada y registrada. Hasta 3 surtidos (6 meses de vigencia).',
  IV:  'Con receta médica. Se surte mientras dure el tratamiento.',
  V:   'Con o sin receta. Venta libre en cualquier farmacia.',
  VI:  'Venta libre. Productos regulados de libre acceso.',
}

interface FractionChipProps {
  fraction: DrugFraction
  size?: 'sm' | 'md'
}

export function FractionChip({ fraction, size = 'sm' }: FractionChipProps) {
  const color = FRACTION_COLORS[fraction]
  const label = `Frac. ${fraction}`
  return (
    <span
      style={{ backgroundColor: color + '20', color, borderColor: color + '40' }}
      className={`inline-flex items-center font-semibold border rounded-full ${
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      {label}
    </span>
  )
}

export function FractionLegend() {
  const fractions: DrugFraction[] = ['I', 'II', 'III', 'IV', 'V', 'VI']
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Clasificación Art. 226 LGS
      </p>
      {fractions.map(f => (
        <div key={f} className="flex items-start gap-3">
          <FractionChip fraction={f} size="md" />
          <p className="text-xs text-muted-foreground leading-relaxed flex-1">
            {FRACTION_DESCRIPTION[f]}
          </p>
        </div>
      ))}
    </div>
  )
}
