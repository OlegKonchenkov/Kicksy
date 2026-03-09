'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12 pitch-lines grain overflow-hidden">

      {/* Atmospheric glow orb */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(200,255,107,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(200,255,107,0.4), 0 0 80px rgba(200,255,107,0.15)',
            }}
          >
            <span style={{ fontSize: 36 }}>⚽</span>
          </div>
          <div className="text-center">
            <h1
              className="text-gradient-primary"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 10vw, 3.5rem)',
                fontWeight: 800,
                lineHeight: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Kicksy
            </h1>
            <p
              style={{
                color: 'var(--color-text-2)',
                fontSize: '0.875rem',
                marginTop: '0.5rem',
                letterSpacing: '0.02em',
              }}
            >
              Organizza. Gioca. Scala la classifica.
            </p>
          </div>
        </div>

        {/* Login card */}
        <div
          className="w-full surface"
          style={{
            padding: '2rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          <div className="text-center">
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-1)',
              }}
            >
              Entra in campo
            </h2>
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-2)',
                marginTop: '0.375rem',
              }}
            >
              Accedi con il tuo account Google per iniziare
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-danger-dim)',
                border: '1px solid rgba(255,59,92,0.3)',
                color: 'var(--color-danger)',
                fontSize: '0.8125rem',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="touch-target"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              background: loading ? 'var(--color-elevated)' : 'var(--color-primary)',
              color: loading ? 'var(--color-text-2)' : 'var(--color-text-inverse)',
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              fontSize: '0.9375rem',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 24px rgba(200,255,107,0.3)',
            }}
          >
            {loading ? (
              <>
                <LoadingSpinner />
                Accesso in corso...
              </>
            ) : (
              <>
                <GoogleIcon />
                Continua con Google
              </>
            )}
          </button>

          <div className="divider-text">
            <span>sicuro e protetto</span>
          </div>

          <p
            style={{
              fontSize: '0.6875rem',
              color: 'var(--color-text-3)',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            Accedendo accetti i{' '}
            <span style={{ color: 'var(--color-text-2)' }}>Termini di Servizio</span>
            {' '}e la{' '}
            <span style={{ color: 'var(--color-text-2)' }}>Privacy Policy</span>
          </p>
        </div>

        {/* Tagline */}
        <p
          style={{
            color: 'var(--color-text-3)',
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Il campo ti aspetta ⚡
        </p>
      </div>
    </div>
  )
}

function LoginPageSkeleton() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-12 grain">
      <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>Caricamento...</p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
