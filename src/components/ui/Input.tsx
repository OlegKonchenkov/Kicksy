import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-text-2)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-3)',
                pointerEvents: 'none',
              }}
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-11 rounded-[--radius-md]',
              'bg-[--color-elevated] border border-[--color-border]',
              'text-[--color-text-1] text-sm',
              'transition-all duration-150',
              'placeholder:text-[--color-text-3]',
              'focus:outline-none focus:border-[--color-primary] focus:shadow-[0_0_0_3px_rgba(200,255,107,0.15)]',
              error && 'border-[--color-danger] focus:border-[--color-danger] focus:shadow-[0_0_0_3px_rgba(255,59,92,0.15)]',
              leftIcon ? 'pl-10 pr-4' : 'px-4',
              className
            )}
            {...props}
          />
        </div>

        {error && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>{error}</p>
        )}
        {hint && !error && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
