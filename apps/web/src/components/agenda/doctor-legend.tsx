'use client'

import { doctorColor } from 'medclinic-shared'

export interface LegendDoctor {
  id: string
  firstName: string
  lastName: string
}

interface DoctorLegendProps {
  doctors: LegendDoctor[]
}

/** Leyenda de colores por médico — visible en la vista "Todos los médicos". */
export function DoctorLegend({ doctors }: DoctorLegendProps) {
  if (doctors.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border bg-card px-3 py-2">
      {doctors.map((d) => {
        const color = doctorColor(d.id)
        return (
          <span key={d.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color.bar }} />
            Dr. {d.firstName} {d.lastName}
          </span>
        )
      })}
    </div>
  )
}
