'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastKind = 'success' | 'error' | 'info'

type ToastItem = {
  id: number
  message: string
  kind: ToastKind
}

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setItems((prev) => [...prev, { id, message, kind }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 2600)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'max(1rem, env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 300,
          pointerEvents: 'none',
          padding: '0 1rem',
        }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            style={{
              width: 'min(560px, 100%)',
              borderRadius: 'var(--radius-md)',
              border:
                t.kind === 'success'
                  ? '1px solid rgba(200,255,107,0.35)'
                  : t.kind === 'error'
                    ? '1px solid rgba(255,59,92,0.35)'
                    : '1px solid var(--color-border)',
              background:
                t.kind === 'success'
                  ? 'rgba(200,255,107,0.12)'
                  : t.kind === 'error'
                    ? 'rgba(255,59,92,0.12)'
                    : 'rgba(24,28,37,0.92)',
              color:
                t.kind === 'success'
                  ? 'var(--color-primary)'
                  : t.kind === 'error'
                    ? 'var(--color-danger)'
                    : 'var(--color-text-1)',
              padding: '0.75rem 0.875rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
