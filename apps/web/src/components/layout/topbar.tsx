'use client'

import * as React from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  right?: React.ReactNode
}

export function Topbar({ title, subtitle, actions, right }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Menú"
          onClick={() => document.dispatchEvent(new CustomEvent('toggle-sidebar'))}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
