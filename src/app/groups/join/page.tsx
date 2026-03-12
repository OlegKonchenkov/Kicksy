'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@/components/ui'

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
    if (trimmed.length < 6) {
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
    if (trimmed.length < 6) {
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
        `/groups/${joinedGroupId}/ratings?self=1&next=${encodeURIComponent(`/groups/${joinedGroupId}`)}`
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
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 'calc(40px + env(safe-area-inset-top) + 0.5rem) 1rem 2rem' }}>
      <button
        type="button"
        onClick={() => router.back()}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-3)',
          cursor: 'pointer',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
          padding: 0,
        }}
      >
        ← Indietro
      </button>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--color-text-1)',
          marginBottom: '0.5rem',
        }}
      >
        Unisciti
      </h1>
      <p
        style={{
          color: 'var(--color-text-3)',
          fontSize: '0.875rem',
          marginBottom: '2rem',
        }}
      >
        Inserisci il codice invito del gruppo o apri un link invito ricevuto
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <Input
          label="Codice invito"
          placeholder="es. AB12CD34"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={12}
          required
          autoFocus
        />

        {isInAppBrowser && isLoggedIn !== true && (
          <div
            style={{
              padding: '0.875rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,184,0,0.08)',
              border: '1px solid rgba(255,184,0,0.28)',
              color: '#FFD166',
              fontSize: '0.8125rem',
              lineHeight: 1.6,
            }}
          >
            Questo link sembra aperto dentro un&apos;app. Per evitare problemi col login Google,
            aprilo in Chrome o Safari e poi continua.
          </div>
        )}

        {error && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{error}</p>
        )}

        {isLoggedIn ? (
          <Button type="submit" fullWidth loading={isPending} size="lg">
            Unisciti al gruppo →
          </Button>
        ) : (
          <Button type="submit" fullWidth loading={isSigningIn} size="lg">
            Continua con Google
          </Button>
        )}
      </form>
    </div>
  )
}

function JoinGroupFallback() {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: 'calc(40px + env(safe-area-inset-top) + 0.5rem) 1rem 2rem',
      }}
    >
      <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>Caricamento...</p>
    </div>
  )
}
