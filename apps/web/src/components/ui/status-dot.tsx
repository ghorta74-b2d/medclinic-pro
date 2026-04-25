import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const dotVariants = cva('inline-block rounded-full', {
  variants: {
    status: {
      active: 'bg-success',
      inactive: 'bg-muted-foreground/60',
      warning: 'bg-warning',
      error: 'bg-destructive',
      info: 'bg-primary',
    },
    size: {
      sm: 'h-1.5 w-1.5',
      md: 'h-2 w-2',
      lg: 'h-2.5 w-2.5',
    },
    pulse: {
      true: 'animate-pulse',
      false: '',
    },
  },
  defaultVariants: {
    status: 'active',
    size: 'md',
    pulse: false,
  },
})

export interface StatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof dotVariants> {}

function StatusDot({ className, status, size, pulse, ...props }: StatusDotProps) {
  return <span className={cn(dotVariants({ status, size, pulse }), className)} {...props} />
}

export { StatusDot }
