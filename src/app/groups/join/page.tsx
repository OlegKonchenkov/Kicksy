'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, LoadingScreen, LoadingSpinner } from '@/components/ui'

export default function JoinGroupPage() {
  return (
    <Suspense fallback={<JoinGroupFallback />}>
      <JoinGroupContent />
    </Suspense>
  )
}

function JoinGroupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromLink = (searchParams.get('code') ?? '').trim().toUpperCase()
  const [isPending, startTransition] = useTransition()
  const [code, setCode] = useState(codeFromLink)
  const [error, setError] = useState<string | null>(null)
  const [autoJoinTried, setAutoJoinTried] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)

  useEffect(() => {
    const ua = window.navigator.userAgent || ''
    const inAppPattern = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Telegram|Twitter|GSA|LinkedInApp/i
    setIsInAppBrowser(inAppPattern.test(ua))
  }, [])

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsLoggedIn(Boolean(user))
    }

    void loadUser()
  }, [])

  async function startGoogleLogin(rawCode: string) {
    const trimmed = rawCode.trim().toUpperCase()
    if (!isValidInviteCode(trimmed)) {
      setError('Inserisci un codice invito valido')
      return
    }

    setError(null)
    setIsSigningIn(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/groups/join?code=${trimmed}`)}`,
      },
    })

    if (signInError) {
      setError(signInError.message)
      setIsSigningIn(false)
    }
  }

  function joinByCode(rawCode: string) {
    setError(null)

    const trimmed = rawCode.trim().toUpperCase()
    if (!isValidInviteCode(trimmed)) {
      setError('Inserisci un codice invito valido')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsLoggedIn(false)
        return
      }

      const { data: joinedGroupId, error: joinErr } = await supabase.rpc(
        'join_group_by_invite_code',
        { p_invite_code: trimmed }
      )

      if (joinErr || !joinedGroupId) {
        if (joinErr?.message.includes('invite_code_not_found')) {
          setError('Codice invito non trovato o disabilitato')
        } else if (joinErr?.message.includes('group_members_user_id_fkey')) {
          setError('Profilo utente non pronto. Riprova tra qualche secondo.')
        } else {
          setError(joinErr?.message ?? 'Impossibile unirsi al gruppo')
        }
        return
      }

      router.replace(
        `/groups/${joinedGroupId}/ratings?self=1&first=1&next=${encodeURIComponent(`/groups/${joinedGroupId}`)}`
      )
    })
  }

  useEffect(() => {
    setCode(codeFromLink)
    if (!codeFromLink || autoJoinTried || isLoggedIn !== true) return
    setAutoJoinTried(true)
    joinByCode(codeFromLink)
  }, [autoJoinTried, codeFromLink, isLoggedIn])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (isLoggedIn) {
      joinByCode(code)
      return
    }

    await startGoogleLogin(code)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12 pitch-lines grain overflow-hidden">
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

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-3)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            padding: 0,
          }}
        >
          {'<-'} Indietro
        </button>

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
                fontSize: 'clamp(2.2rem, 9vw, 3.2rem)',
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

        <form
          onSubmit={handleSubmit}
          className="w-full surface"
          style={{
            padding: '2rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
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
              Unisciti al gruppo
            </h2>
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-2)',
                marginTop: '0.375rem',
              }}
            >
              Inserisci il codice invito per entrare subito
            </p>
          </div>

          <Input
            label="Codice invito"
            placeholder="es. A5F52075"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={12}
            required
            autoFocus
          />

          {isInAppBrowser && isLoggedIn !== true && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,184,0,0.08)',
                border: '1px solid rgba(255,184,0,0.28)',
                color: '#FFD166',
                fontSize: '0.8125rem',
                lineHeight: 1.6,
              }}
            >
              Apri questo link in Chrome o Safari prima di fare login Google.
            </div>
          )}

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

          {isLoggedIn ? (
            <button
              type="submit"
              disabled={isPending}
              className="touch-target"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                background: isPending ? 'var(--color-elevated)' : 'var(--color-primary)',
                color: isPending ? 'var(--color-text-2)' : 'var(--color-text-inverse)',
                fontFamily: 'var(--font-ui)',
                fontWeight: 600,
                fontSize: '0.9375rem',
                transition: 'all 0.2s ease',
                opacity: isPending ? 0.7 : 1,
                cursor: isPending ? 'not-allowed' : 'pointer',
                boxShadow: isPending ? 'none' : '0 0 24px rgba(200,255,107,0.3)',
              }}
            >
              {isPending ? (
                <>
                  <LoadingSpinner />
                  Unione in corso...
                </>
              ) : (
                'Unisciti al gruppo'
              )}
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSigningIn}
              className="touch-target"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                background: isSigningIn ? 'var(--color-elevated)' : 'var(--color-primary)',
                color: isSigningIn ? 'var(--color-text-2)' : 'var(--color-text-inverse)',
                fontFamily: 'var(--font-ui)',
                fontWeight: 600,
                fontSize: '0.9375rem',
                transition: 'all 0.2s ease',
                opacity: isSigningIn ? 0.7 : 1,
                cursor: isSigningIn ? 'not-allowed' : 'pointer',
                boxShadow: isSigningIn ? 'none' : '0 0 24px rgba(200,255,107,0.3)',
              }}
            >
              {isSigningIn ? (
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
          )}

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
            Il codice viene validato lato server e usato solo per l&apos;ingresso al gruppo.
          </p>
        </form>
      </div>
    </div>
  )
}

function JoinGroupFallback() {
  return <LoadingScreen label="Caricamento invito..." />
}

function isValidInviteCode(code: string) {
  return /^[A-Z0-9]{6,12}$/.test(code)
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
