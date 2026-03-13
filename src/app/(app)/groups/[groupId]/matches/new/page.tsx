'use client'

import { useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createMatch } from '@/lib/actions/matches'
import { Button, Input } from '@/components/ui'
import { getMapsHref } from '@/lib/maps'

type MatchFormat = '5v5' | '8v8' | '11v11' | 'custom'

const FORMAT_PRESETS: Record<Exclude<MatchFormat, 'custom'>, {
  label: string
  maxPlayers: number
  minPlayers: number
  teamSize: number
  hint: string
}> = {
  '5v5': { label: '5v5', maxPlayers: 10, minPlayers: 6, teamSize: 5, hint: 'Totale 10 giocatori' },
  '8v8': { label: '8v8', maxPlayers: 16, minPlayers: 14, teamSize: 8, hint: 'Ideale 16, ok anche in 14' },
  '11v11': { label: '11v11', maxPlayers: 22, minPlayers: 18, teamSize: 11, hint: 'Totale 22 giocatori' },
}

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

  const [format, setFormat] = useState<MatchFormat>('5v5')
  const [customPlayers, setCustomPlayers] = useState('10')

  function getPlayersConfig() {
    if (format !== 'custom') return FORMAT_PRESETS[format]

    const parsed = Number.parseInt(customPlayers, 10)
    const maxPlayers = Number.isFinite(parsed) ? parsed : 0
    return {
      label: 'Custom',
      maxPlayers,
      minPlayers: Math.max(4, Math.floor(maxPlayers * 0.6)),
      teamSize: Math.max(2, Math.floor(maxPlayers / 2)),
      hint: 'Totale personalizzato',
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) { setError('Inserisci un titolo'); return }
    if (!date) { setError('Inserisci la data'); return }

    const cfg = getPlayersConfig()
    if (format === 'custom') {
      if (!Number.isFinite(cfg.maxPlayers) || cfg.maxPlayers < 4) {
        setError('Nel custom inserisci almeno 4 giocatori')
        return
      }
      if (cfg.maxPlayers > 40) {
        setError('Nel custom il massimo è 40 giocatori')
        return
      }
      if (cfg.maxPlayers % 2 !== 0) {
        setError('Nel custom inserisci un numero pari di giocatori')
        return
      }
    }

    const scheduledAt = new Date(`${date}T${time}`).toISOString()

    startTransition(async () => {
      const result = await createMatch(groupId, {
        title: title.trim(),
        scheduled_at: scheduledAt,
        location: location.trim() || null,
        max_players: cfg.maxPlayers,
        min_players: cfg.minPlayers,
        team_size: cfg.teamSize,
        status: 'open',
      })

      if (result.error) { setError(result.error); return }
      router.replace(`/matches/${result.data!.id}`)
    })
  }

  const currentCfg = getPlayersConfig()
  const mapsHref = location.trim() ? getMapsHref(location) : ''

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
          label="Luogo o link Maps (opzionale)"
          placeholder="es. Campetto di Via Roma oppure link Google Maps"
          value={location}
          onChange={e => setLocation(e.target.value)}
          maxLength={120}
        />
        {location.trim() && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', marginTop: '-0.5rem' }}
          >
            Apri posizione su Maps -&gt;
          </a>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-2)', fontFamily: 'var(--font-display)' }}>
            Formato
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {(['5v5', '8v8', '11v11', 'custom'] as const).map((opt) => {
              const selected = format === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFormat(opt)}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${selected ? 'rgba(200,255,107,0.6)' : 'var(--color-border)'}`,
                    background: selected ? 'rgba(200,255,107,0.12)' : 'var(--color-surface)',
                    color: selected ? 'var(--color-primary)' : 'var(--color-text-2)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          {format === 'custom' && (
            <Input
              label="Giocatori totali (custom)"
              type="number"
              min={4}
              max={40}
              step={2}
              value={customPlayers}
              onChange={(e) => setCustomPlayers(e.target.value)}
              required
            />
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
            {format === 'custom' ? 'Numero totale giocatori (pari).' : FORMAT_PRESETS[format].hint}
          </p>
        </div>

        <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-2)', margin: 0 }}>
            Capienza: <strong style={{ color: 'var(--color-text-1)' }}>{currentCfg.maxPlayers}</strong> giocatori ·
            Team size: <strong style={{ color: 'var(--color-text-1)' }}>{currentCfg.teamSize}v{currentCfg.teamSize}</strong>
          </p>
        </div>

        {error && <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{error}</p>}

        <Button type="submit" fullWidth loading={isPending} size="lg">
          Crea Partita
        </Button>
      </form>
    </div>
  )
}
