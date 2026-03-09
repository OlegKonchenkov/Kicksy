import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-[--color-primary] text-[--color-text-inverse] font-semibold shadow-[0_0_20px_rgba(200,255,107,0.3)] hover:shadow-[0_0_30px_rgba(200,255,107,0.5)] hover:brightness-105 active:brightness-95',
  secondary:
    'bg-[--color-secondary] text-[--color-text-inverse] font-semibold hover:brightness-105 active:brightness-95',
  outline:
    'border border-[--color-border] bg-transparent text-[--color-text-1] hover:border-[--color-primary] hover:text-[--color-primary]',
  ghost:
    'bg-transparent text-[--color-text-2] hover:bg-[--color-elevated] hover:text-[--color-text-1]',
  danger:
    'bg-[--color-danger] text-white font-semibold hover:brightness-110 active:brightness-90',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-[--radius-sm]',
  md: 'h-11 px-5 text-sm rounded-[--radius-md]',
  lg: 'h-14 px-6 text-base rounded-[--radius-lg]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          'font-[--font-ui] transition-all duration-150',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--color-primary] focus-visible:outline-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'min-h-[44px] min-w-[44px]',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && <LoadingSpinner size={size} />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

function LoadingSpinner({ size }: { size: Size }) {
  const s = size === 'sm' ? 14 : size === 'lg' ? 20 : 16
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
      className="animate-spin"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
