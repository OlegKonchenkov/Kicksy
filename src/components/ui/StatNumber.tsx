import { cn } from '@/lib/utils'

interface StatNumberProps {
  value: number | string
  label: string
  /** optional sub-label or trend */
  sub?: string
  size?: 'sm' | 'md' | 'lg'
  highlight?: boolean
  className?: string
}

const sizeMap = {
  sm: { value: '1.75rem', label: '0.6875rem' },
  md: { value: '2.25rem', label: '0.75rem' },
  lg: { value: '3rem',    label: '0.875rem' },
}

export function StatNumber({
  value,
  label,
  sub,
  size = 'md',
  highlight = false,
  className,
}: StatNumberProps) {
  const { value: valueSize, label: labelSize } = sizeMap[size]

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      <span
        className="stat-number"
        style={{
          fontSize: valueSize,
          color: highlight ? 'var(--color-primary)' : 'var(--color-text-1)',
          textShadow: highlight ? '0 0 16px rgba(200,255,107,0.5)' : undefined,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: labelSize,
          color: 'var(--color-text-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      {sub && (
        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)' }}>{sub}</span>
      )}
    </div>
  )
}
