import type { Appointment } from 'medclinic-shared'
import { Users, CheckCircle2, Clock, XCircle } from 'lucide-react'

interface DayStatsProps {
  appointments: Appointment[]
}

export function DayStats({ appointments }: DayStatsProps) {
  const total = appointments.filter((a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW').length
  const completed = appointments.filter((a) => a.status === 'COMPLETED').length
  const pending = appointments.filter((a) =>
    ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status)
  ).length
  const cancelled = appointments.filter((a) =>
    a.status === 'CANCELLED' || a.status === 'NO_SHOW'
  ).length

  const stats = [
    {
      label: 'Total citas',
      value: total,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Completadas',
      value: completed,
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Pendientes',
      value: pending,
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Canceladas',
      value: cancelled,
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ]

  return (
    <>
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}
