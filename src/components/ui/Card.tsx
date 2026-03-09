import { cn } from '@/lib/utils'
import { type HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  glow?: 'primary' | 'secondary' | 'none'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const glowMap = {
  primary: 'shadow-[0_0_24px_rgba(200,255,107,0.15)] border-[rgba(200,255,107,0.2)]',
  secondary: 'shadow-[0_0_24px_rgba(255,184,0,0.15)] border-[rgba(255,184,0,0.2)]',
  none: '',
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ elevated = false, glow = 'none', padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[--radius-lg] border border-[--color-border]',
          elevated ? 'bg-[--color-elevated]' : 'bg-[--color-surface]',
          glow !== 'none' && glowMap[glow],
          paddingMap[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'font-[--font-display] text-base font-bold uppercase tracking-wider text-[--color-text-1]',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}
