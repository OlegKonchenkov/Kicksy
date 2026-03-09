'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { deleteMatch, updateMatch } from '@/lib/actions/matches'
import type { MatchStatus } from '@/types'
import { useToast } from '@/components/ui'

type MatchFormat = '5v5' | '8v8' | '11v11' | 'custom'

const FORMAT_PRESETS: Record<Exclude<MatchFormat, 'custom'>, {
  maxPlayers: number
  minPlayers: number
  teamSize: number
}> = {
  '5v5': { maxPlayers: 10, minPlayers: 6, teamSize: 5 },
  '8v8': { maxPlayers: 16, minPlayers: 14, teamSize: 8 },
  '11v11': { maxPlayers: 22, minPlayers: 18, teamSize: 11 },
}

const STATUS_OPTIONS: MatchStatus[] = ['draft', 'open', 'locked', 'cancelled']

function toLocalDateTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const min = pad(d.getMinutes())
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` }
}

export default function MatchEditPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.matchId as string
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('21:00')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState<MatchStatus>('open')
  const [format, setFormat] = useState<MatchFormat>('5v5')
  const [customPlayers, setCustomPlayers] = useState('10')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: match, error: matchErr } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()
      if (matchErr || !match) { setError('Partita non trovata'); setLoading(false); return }

      const { data: member } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', match.group_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      if (!member || member.role !== 'admin') { setError('Solo admin'); setLoading(false); return }

      const dt = toLocalDateTime(match.scheduled_at)
      setGroupId(match.group_id)
      setTitle(match.title ?? '')
      setDate(dt.date)
      setTime(dt.time)
      setLocation(match.location ?? '')
      setStatus(match.status as MatchStatus)

      if (match.team_size === 5 && match.max_players === 10) setFormat('5v5')
      else if (match.team_size === 8 && (match.max_players === 16 || match.max_players === 14)) setFormat('8v8')
      else if (match.team_size === 11 && match.max_players === 22) setFormat('11v11')
      else setFormat('custom')
      setCustomPlayers(String(match.max_players))
      setLoading(false)
    }
    load()
  }, [matchId, router])

  const cfg = useMemo(() => {
    if (format !== 'custom') return FORMAT_PRESETS[format]
    const n = Number.parseInt(customPlayers, 10)
    const maxPlayers = Number.isFinite(n) ? n : 0
    return {
      maxPlayers,
      minPlayers: Math.max(4, Math.floor(maxPlayers * 0.6)),
      teamSize: Math.max(2, Math.floor(maxPlayers / 2)),
    }
  }, [format, customPlayers])

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) { setError('Inserisci un titolo'); return }
    if (!date) { setError('Inserisci la data'); return }
    if (format === 'custom') {
      if (cfg.maxPlayers < 4) { setError('Custom minimo 4 giocatori'); return }
      if (cfg.maxPlayers > 40) { setError('Custom massimo 40 giocatori'); return }
      if (cfg.maxPlayers % 2 !== 0) { setError('Inserisci un numero pari'); return }
    }

    const scheduledAt = new Date(`${date}T${time}`).toISOString()
    startTransition(async () => {
      const res = await updateMatch(matchId, {
        title: title.trim(),
        scheduled_at: scheduledAt,
        location: location.trim() || null,
        max_players: cfg.maxPlayers,
        min_players: cfg.minPlayers,
        team_size: cfg.teamSize,
        status,
      })
      if (res.error) { setError(res.error); return }
      showToast('Partita aggiornata', 'success')
      router.replace(`/matches/${matchId}`)
    })
  }

  function handleDelete() {
    setError(null)
    if (!confirm('Vuoi davvero eliminare questa partita?')) return
    startTransition(async () => {
      const res = await deleteMatch(matchId)
      if (res.error) { setError(res.error); return }
      showToast('Partita eliminata', 'success')
      router.replace(groupId ? `/groups/${groupId}/matches` : '/groups')
    })
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--color-text-3)' }}>Caricamento...</div>
  }
  if (error && !groupId) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: 'var(--color-danger)' }}>{error}</p>
        <button type="button" onClick={() => router.back()} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--color-text-2)', cursor: 'pointer' }}>
          ← Indietro
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <button type="button" onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, textAlign: 'left' }}>
        ← Indietro
      </button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
        Modifica Partita
      </h1>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input label="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Input label="Orario" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <Input label="Luogo" value={location} onChange={(e) => setLocation(e.target.value)} />

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
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          {format === 'custom' && (
            <Input label="Giocatori totali (pari)" type="number" min={4} max={40} step={2} value={customPlayers} onChange={(e) => setCustomPlayers(e.target.value)} />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-2)', fontFamily: 'var(--font-display)' }}>
            Stato
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map((s) => {
              const selected = status === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${selected ? 'rgba(200,255,107,0.6)' : 'var(--color-border)'}`,
                    background: selected ? 'rgba(200,255,107,0.12)' : 'var(--color-surface)',
                    color: selected ? 'var(--color-primary)' : 'var(--color-text-2)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-2)', margin: 0 }}>
            Capienza: <strong style={{ color: 'var(--color-text-1)' }}>{cfg.maxPlayers}</strong> · Team size: <strong style={{ color: 'var(--color-text-1)' }}>{cfg.teamSize}v{cfg.teamSize}</strong>
          </p>
        </div>

        {error && <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{error}</p>}

        <Button type="submit" fullWidth loading={isPending} size="lg">
          Salva modifiche
        </Button>
        <Button type="button" variant="ghost" onClick={handleDelete} loading={isPending} fullWidth>
          Elimina partita
        </Button>
      </form>
    </div>
  )
}
