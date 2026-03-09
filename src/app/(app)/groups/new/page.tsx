'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'

export default function NewGroupPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim() || name.length < 2) {
      setError('Il nome deve avere almeno 2 caratteri')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: group, error: groupErr } = await supabase
        .from('groups')
        .insert({ name: name.trim(), description: description.trim() || null, created_by: user.id })
        .select('id')
        .single()

      if (groupErr) { setError(groupErr.message); return }

      await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id, role: 'admin' })

      router.replace(`/groups/${group.id}`)
    })
  }

  return (
    <div style={{ padding: '1.5rem 1rem' }}>
      <button
        type="button"
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '1.5rem', padding: 0 }}
      >
        ← Indietro
      </button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)', marginBottom: '0.5rem' }}>
        Nuovo Gruppo
      </h1>
      <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Crea il tuo gruppo e invita i tuoi amici
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Input
          label="Nome del gruppo"
          placeholder="es. Calcetto del Martedì"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={50}
          required
          autoFocus
        />
        <Input
          label="Descrizione (opzionale)"
          placeholder="es. Il nostro calcetto settimanale al campetto"
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={200}
        />

        {error && <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{error}</p>}

        <Button type="submit" fullWidth loading={isPending} size="lg">
          Crea Gruppo ⚡
        </Button>
      </form>
    </div>
  )
}
