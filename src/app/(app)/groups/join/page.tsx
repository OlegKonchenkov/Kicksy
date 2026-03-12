'use client'

import { useState, useTransition } from 'react'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@/components/ui'

export default function JoinGroupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromLink = (searchParams.get('code') ?? '').trim().toUpperCase()
  const [isPending, startTransition] = useTransition()
  const [code, setCode] = useState(codeFromLink)
  const [error, setError] = useState<string | null>(null)
  const [autoJoinTried, setAutoJoinTried] = useState(false)

  function joinByCode(rawCode: string) {
    setError(null)

    const trimmed = rawCode.trim().toUpperCase()
    if (trimmed.length < 6) {
      setError('Inserisci un codice invito valido')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(`/groups/join?code=${trimmed}`)}`)
        return
      }

      const { data: joinedGroupId, error: joinErr } = await supabase
        .rpc('join_group_by_invite_code', { p_invite_code: trimmed })

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

      router.replace(`/groups/${joinedGroupId}`)
    })
  }

  useEffect(() => {
    setCode(codeFromLink)
    if (!codeFromLink || autoJoinTried) return
    setAutoJoinTried(true)
    joinByCode(codeFromLink)
  }, [codeFromLink, autoJoinTried])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    joinByCode(code)
  }

  return (
    <div style={{ padding: '1.5rem 1rem' }}>
      <button type="button" onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '1.5rem', padding: 0 }}>
        ← Indietro
      </button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)', marginBottom: '0.5rem' }}>
        Unisciti
      </h1>
      <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Inserisci il codice invito del gruppo o apri un link invito ricevuto
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Input
          label="Codice invito"
          placeholder="es. AB12CD34"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          maxLength={12}
          required
          autoFocus
        />

        {error && <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{error}</p>}

        <Button type="submit" fullWidth loading={isPending} size="lg">
          Unisciti al gruppo →
        </Button>
      </form>
    </div>
  )
}

