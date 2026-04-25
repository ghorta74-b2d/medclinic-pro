import * as React from 'react'
import { cn } from '@/lib/utils'

export interface AppShellProps {
  sidebar: React.ReactNode
  banner?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function AppShell({ sidebar, banner, children, className }: AppShellProps) {
  return (
    <div className={cn('flex min-h-screen bg-background text-foreground font-sf', className)}>
      {sidebar}
      <main className="flex min-w-0 flex-1 flex-col">
        {banner}
        <div className="flex-1">{children}</div>
      </main>
    </div>
  )
}
