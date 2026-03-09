'use client'

import { useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createMatch } from '@/lib/actions/matches'
import { Button, Input } from '@/components/ui'

export default function NewMatchPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.groupId as string
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('21:00')
  const [location, setLocation] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(10)
  const [teamSize, setTeamSize] = useState(5)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) { setError('Inserisci un titolo'); return }
    if (!date) { setError('Inserisci la data'); return }

    const scheduledAt = new Date(`${date}T${time}`).toISOString()

    startTransition(async () => {
      const result = await createMatch(groupId, {
        title: title.trim(),
        scheduled_at: scheduledAt,
        location: location.trim() || null,
        max_players: maxPlayers,
        min_players: Math.floor(maxPlayers * 0.6),
        team_size: teamSize,
        status: 'open',
      } as Parameters<typeof createMatch>[1] & { status: 'open' })

      if (result.error) { setError(result.error); return }
      router.replace(`/matches/${result.data!.id}`)
    })
  }

  return (
    <div style={{ padding: '1.5rem 1rem' }}>
      <button type="button" onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '1.5rem', padding: 0 }}>
        ← Indietro
      </button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)', marginBottom: '0.5rem' }}>
        Nuova Partita
      </h1>
      <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Organizza la prossima sfida
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Input
          label="Titolo partita"
          placeholder="es. Calcetto del Martedì #42"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={80}
          required
          autoFocus
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Input
            label="Data"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
          <Input
            label="Orario"
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            required
          />
        </div>

        <Input
          label="Luogo (opzionale)"
          placeholder="es. Campetto di Via Roma"
          value={location}
          onChange={e => setLocation(e.target.value)}
          maxLength={120}
        />

        {/* Player count */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-2)', fontFamily: 'var(--font-display)' }}>
            Giocatori massimi
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[6, 8, 10, 12, 14, 16].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => { setMaxPlayers(n); setTeamSize(Math.floor(n / 2)) }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${maxPlayers === n ? 'rgba(200,255,107,0.6)' : 'var(--color-border)'}`,
                  background: maxPlayers === n ? 'rgba(200,255,107,0.12)' : 'var(--color-surface)',
                  color: maxPlayers === n ? 'var(--color-primary)' : 'var(--color-text-2)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {n}v{n}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{error}</p>}

        <Button type="submit" fullWidth loading={isPending} size="lg">
          Crea Partita ⚡
        </Button>
      </form>
    </div>
  )
}
