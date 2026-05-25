import type { DispensingCategory } from 'medclinic-shared'
import { DISPENSING_META } from 'medclinic-shared'

const LEGEND_ORDER: DispensingCategory[] = ['fisica', 'aliadas', 'libre', 'laboratorio']

interface DispensingChipProps {
  category: DispensingCategory
  size?: 'sm' | 'md'
}

// Small colored pill marker (the "capsule" icon in the legend)
function CapsuleDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: 18, height: 10, background: `linear-gradient(90deg, ${color} 50%, ${color}99 50%)` }}
    />
  )
}

export function DispensingChip({ category, size = 'sm' }: DispensingChipProps) {
  const meta = DISPENSING_META[category]
  return (
    <span
      style={{ backgroundColor: meta.color + '20', color: meta.color, borderColor: meta.color + '40' }}
      className={`inline-flex items-center gap-1.5 font-semibold border rounded-full ${
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  )
}

// Reference legend: 4 dispensing categories with color code (per NOM)
export function FractionLegend() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Clasificación de medicamentos
      </p>
      {LEGEND_ORDER.map(cat => {
        const meta = DISPENSING_META[cat]
        const isHighlight = cat === 'libre'
        return (
          <div key={cat} className="flex items-center gap-3">
            <CapsuleDot color={meta.color} />
            <p className={`text-xs leading-relaxed flex-1 ${isHighlight ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              {meta.label} <span className="opacity-70">/ {meta.rule}</span>
            </p>
          </div>
        )
      })}
    </div>
  )
}
