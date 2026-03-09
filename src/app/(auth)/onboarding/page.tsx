'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Step = 'profile' | 'group'
type PlayerRole = 'D' | 'C' | 'E' | 'W' | 'A'

const ROLES: { value: PlayerRole; label: string; emoji: string; desc: string }[] = [
  { value: 'D', label: 'Difensore',  emoji: '🛡️', desc: 'Arcigno e affidabile' },
  { value: 'C', label: 'Centrocampista', emoji: '🧠', desc: 'Il motore del gioco' },
  { value: 'E', label: 'Esterno',    emoji: '⚡', desc: 'Veloce sulla fascia' },
  { value: 'W', label: 'Trequartista', emoji: '🪄', desc: 'Fantasia e qualità' },
  { value: 'A', label: 'Attaccante', emoji: '🎯', desc: 'Gol e gloria' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('profile')

  // Profile step state
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<PlayerRole | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Group step state
  const [groupMode, setGroupMode] = useState<'create' | 'join' | null>(null)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [groupError, setGroupError] = useState<string | null>(null)

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(null)

    if (!username.trim() || username.length < 3) {
      setProfileError('Il username deve avere almeno 3 caratteri')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim().toLowerCase(),
          full_name: fullName.trim() || null,
          preferred_role: role,
        })
        .eq('id', user.id)

      if (error) {
        if (error.code === '23505') {
          setProfileError('Questo username è già in uso. Scegliene un altro.')
        } else {
          setProfileError(error.message)
        }
        return
      }

      setStep('group')
    })
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    setGroupError(null)

    if (!groupName.trim() || groupName.length < 2) {
      setGroupError('Il nome del gruppo deve avere almeno 2 caratteri')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      // Create group
      const { data: group, error: groupErr } = await supabase
        .from('groups')
        .insert({ name: groupName.trim(), created_by: user.id })
        .select('id')
        .single()

      if (groupErr) { setGroupError(groupErr.message); return }

      // Add creator as admin
      const { error: memberErr } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id, role: 'admin' })

      if (memberErr) { setGroupError(memberErr.message); return }

      router.replace(`/groups/${group.id}`)
    })
  }

  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault()
    setGroupError(null)

    const code = inviteCode.trim().toUpperCase()
    if (!code || code.length < 6) {
      setGroupError('Inserisci un codice invito valido')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: group, error: findErr } = await supabase
        .from('groups')
        .select('id, invite_link_enabled')
        .eq('invite_code', code)
        .single()

      if (findErr || !group) {
        setGroupError('Codice invito non trovato. Controlla e riprova.')
        return
      }
      if (!group.invite_link_enabled) {
        setGroupError('Questo link/codice invito è stato disabilitato dall\'admin.')
        return
      }

      const { error: joinErr } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id, role: 'member' })

      if (joinErr) {
        if (joinErr.code === '23505') {
          setGroupError('Sei già membro di questo gruppo!')
        } else {
          setGroupError(joinErr.message)
        }
        return
      }

      router.replace(`/groups/${group.id}`)
    })
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12 grain overflow-hidden">

      {/* Bg glow */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: '-30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(200,255,107,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', justifyContent: 'center' }}>
          {(['profile', 'group'] as const).map((s, i) => (
            <div
              key={s}
              style={{
                height: 4,
                width: 48,
                borderRadius: 999,
                background: step === s || (s === 'profile' && step === 'group')
                  ? 'var(--color-primary)'
                  : 'var(--color-elevated)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* STEP 1: Profile */}
        {step === 'profile' && (
          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Il tuo profilo
              </h1>
              <p style={{ color: 'var(--color-text-2)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Come vuoi essere conosciuto in campo?
              </p>
            </div>

            <Input
              label="Username"
              placeholder="es. bomber99"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              maxLength={24}
              required
            />

            <Input
              label="Nome completo (opzionale)"
              placeholder="es. Marco Rossi"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              maxLength={60}
            />

            {/* Role selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-2)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Ruolo preferito
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                {ROLES.map(({ value, label, emoji }) => {
                  const selected = role === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(selected ? null : value)}
                      title={label}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.625rem 0.25rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${selected ? 'rgba(200,255,107,0.6)' : 'var(--color-border)'}`,
                        background: selected ? 'rgba(200,255,107,0.12)' : 'var(--color-elevated)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        minHeight: 44,
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{emoji}</span>
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: selected ? 'var(--color-primary)' : 'var(--color-text-3)',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {value}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {profileError && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{profileError}</p>
            )}

            <Button type="submit" fullWidth loading={isPending} size="lg">
              Avanti →
            </Button>
          </form>
        )}

        {/* STEP 2: Group */}
        {step === 'group' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Il tuo gruppo
              </h1>
              <p style={{ color: 'var(--color-text-2)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Crea un nuovo gruppo o unisciti a uno esistente
              </p>
            </div>

            {/* Mode selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {(['create', 'join'] as const).map((mode) => {
                const selected = groupMode === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setGroupMode(mode); setGroupError(null) }}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${selected ? 'rgba(200,255,107,0.6)' : 'var(--color-border)'}`,
                      background: selected ? 'rgba(200,255,107,0.1)' : 'var(--color-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease',
                      minHeight: 90,
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '1.75rem' }}>
                      {mode === 'create' ? '🏗️' : '🔗'}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: selected ? 'var(--color-primary)' : 'var(--color-text-1)',
                      }}
                    >
                      {mode === 'create' ? 'Crea gruppo' : 'Unisciti'}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Create form */}
            {groupMode === 'create' && (
              <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                  label="Nome del gruppo"
                  placeholder="es. Calcetto del Martedì"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                  autoFocus
                  required
                />
                {groupError && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{groupError}</p>
                )}
                <Button type="submit" fullWidth loading={isPending} size="lg">
                  Crea e inizia ⚡
                </Button>
              </form>
            )}

            {/* Join form */}
            {groupMode === 'join' && (
              <form onSubmit={handleJoinGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                  label="Codice invito"
                  placeholder="es. AB12CD34"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={12}
                  autoFocus
                  required
                />
                {groupError && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{groupError}</p>
                )}
                <Button type="submit" fullWidth loading={isPending} size="lg">
                  Unisciti al gruppo →
                </Button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setStep('profile')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-3)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                textAlign: 'center',
                padding: '0.5rem',
              }}
            >
              ← Torna indietro
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
