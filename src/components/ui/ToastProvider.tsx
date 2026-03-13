'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { IconCheck, IconShield, IconBolt } from '@/components/ui/Icons'

type ToastKind = 'success' | 'error' | 'info'

type ToastItem = {
  id: number
  message: string
  kind: ToastKind
  exiting: boolean
}

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DURATION = 3000
const EXIT_MS = 280

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === 'success') return <IconCheck size={15} color="#C8FF6B" />
  if (kind === 'error') return <IconShield size={15} color="#FF3B5C" />
  return <IconBolt size={15} color="#fff" />
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setItems((prev) => [...prev, { id, message, kind, exiting: false }])

    // Start exit animation before removal
    const exitTimer = setTimeout(() => {
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    }, DURATION - EXIT_MS)

    const removeTimer = setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
      timersRef.current.delete(id)
    }, DURATION)

    timersRef.current.set(id, exitTimer)
    timersRef.current.set(id + 1, removeTimer)
  }, [])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t))
    }
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container — top of screen, below safe area */}
      <div
        style={{
          position: 'fixed',
          top: 'max(0.75rem, env(safe-area-inset-top))',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 9999,
          pointerEvents: 'none',
          padding: '0 0.75rem',
        }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            style={{
              width: 'min(480px, 100%)',
              borderRadius: 'var(--radius-lg, 1rem)',
              border:
                t.kind === 'success'
                  ? '1px solid rgba(200,255,107,0.4)'
                  : t.kind === 'error'
                    ? '1px solid rgba(255,59,92,0.4)'
                    : '1px solid rgba(255,255,255,0.12)',
              background:
                t.kind === 'success'
                  ? 'rgba(15,20,10,0.95)'
                  : t.kind === 'error'
                    ? 'rgba(25,10,12,0.95)'
                    : 'rgba(18,22,32,0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              color:
                t.kind === 'success'
                  ? '#C8FF6B'
                  : t.kind === 'error'
                    ? '#FF3B5C'
                    : '#fff',
              padding: '0.75rem 1rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              pointerEvents: 'auto',
              animation: t.exiting
                ? 'toast-exit 280ms ease-in forwards'
                : 'toast-enter 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <ToastIcon kind={t.kind} />
            </span>
            <span style={{ lineHeight: 1.4 }}>{t.message}</span>
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
