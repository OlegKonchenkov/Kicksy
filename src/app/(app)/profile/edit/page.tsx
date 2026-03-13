'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { uploadAvatarImage, validateAvatarFile } from '@/lib/avatar-upload'
import { IconShieldRole, IconBrain, IconBolt, IconWand, IconTarget } from '@/components/ui/Icons'
import type { ReactNode } from 'react'

const ROLE_OPTIONS: ReadonlyArray<{ value: string; label: string; icon: (color: string) => ReactNode }> = [
  { value: 'D', label: 'Difensore', icon: (c) => <IconShieldRole size={14} color={c} /> },
  { value: 'C', label: 'Centrocampista', icon: (c) => <IconBrain size={14} color={c} /> },
  { value: 'E', label: 'Esterno', icon: (c) => <IconBolt size={14} color={c} /> },
  { value: 'W', label: 'Trequartista', icon: (c) => <IconWand size={14} color={c} /> },
  { value: 'A', label: 'Attaccante', icon: (c) => <IconTarget size={14} color={c} /> },
]

type RoleValue = 'D' | 'C' | 'E' | 'W' | 'A'

export default function ProfileEditPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [preferredRole, setPreferredRole] = useState<RoleValue | ''>('')
  const [preferredRole2, setPreferredRole2] = useState<RoleValue | ''>('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase
        .from('profiles')
        .select('username, full_name, preferred_role, preferred_role_2, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setUsername(data.username ?? '')
            setFullName(data.full_name ?? '')
            setPreferredRole((data.preferred_role as RoleValue) ?? '')
            setPreferredRole2((data.preferred_role_2 as RoleValue) ?? '')
            setAvatarUrl(data.avatar_url ?? null)
          }
          setLoading(false)
        })
    })
  }, [router])

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const handleSave = () => {
    setError(null)
    if (!username.trim()) { setError('Lo username è obbligatorio'); return }
    if (username.trim().length < 3) { setError('Lo username deve avere almeno 3 caratteri'); return }

    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let nextAvatarUrl = avatarUrl
      if (avatarFile) {
        const { url, error: avatarErr } = await uploadAvatarImage(supabase, user.id, avatarFile)
        if (avatarErr || !url) {
          setError(avatarErr ?? 'Upload immagine fallito')
          return
        }
        nextAvatarUrl = url
      }

      const { error: err } = await supabase
        .from('profiles')
        .update({
          username: username.trim().toLowerCase(),
          full_name: fullName.trim() || null,
          preferred_role: preferredRole || null,
          preferred_role_2: preferredRole2 || null,
          avatar_url: nextAvatarUrl,
        })
        .eq('id', user.id)

      if (err) {
        if (err.code === '23505') setError('Questo username è già in uso')
        else setError(err.message)
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/profile'), 1200)
      }
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--color-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-1)',
    fontSize: '0.9375rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  }

  if (loading) return (
    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
      <span style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>Caricamento…</span>
    </div>
  )

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href="/profile" style={{ color: 'var(--color-text-3)', fontSize: '1.25rem', textDecoration: 'none', lineHeight: 1 }}>
          ←
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
          Modifica Profilo
        </h1>
      </div>

      {/* Success */}
      {success && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: '#22c55e', fontWeight: 600 }}>
          ✓ Profilo aggiornato!
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.625rem' }}>
            Foto Profilo
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Avatar src={avatarPreview ?? avatarUrl} name={fullName || username || 'Player'} size="lg" />
            <label
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-elevated)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                color: 'var(--color-text-2)',
              }}
            >
              Cambia
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const validation = validateAvatarFile(file)
                  if (validation) {
                    setError(validation)
                    return
                  }
                  if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview)
                  setError(null)
                  setAvatarFile(file)
                  setAvatarPreview(URL.createObjectURL(file))
                }}
                style={{ display: 'none' }}
              />
            </label>
            {(avatarPreview || avatarUrl) && (
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null)
                  setAvatarPreview(null)
                  setAvatarUrl(null)
                }}
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--color-text-3)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Rimuovi
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', marginTop: '0.375rem' }}>
            JPG, PNG, WEBP o AVIF, massimo 5MB.
          </p>
        </div>

        {/* Username */}
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.375rem' }}>
            Username *
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', fontSize: '0.9375rem' }}>@</span>
            <input
              value={username}
              onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              maxLength={30}
              placeholder="tuousername"
              style={{ ...inputStyle, paddingLeft: '1.75rem' }}
            />
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
            Solo lettere, numeri e underscore
          </p>
        </div>

        {/* Full name */}
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.375rem' }}>
            Nome Completo
          </label>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            maxLength={80}
            placeholder="Mario Rossi"
            style={inputStyle}
          />
        </div>

        {/* Preferred role */}
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.625rem' }}>
            Ruolo Preferito
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {ROLE_OPTIONS.map(opt => {
              const isPrimary = preferredRole === opt.value
              const isSecondary = preferredRole2 === opt.value
              const isSelected = isPrimary || isSecondary
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (opt.value === preferredRole) {
                      // Deselect primary; secondary (if any) becomes primary
                      setPreferredRole(preferredRole2)
                      setPreferredRole2('')
                    } else if (opt.value === preferredRole2) {
                      // Deselect secondary
                      setPreferredRole2('')
                    } else if (!preferredRole) {
                      setPreferredRole(opt.value)
                    } else if (!preferredRole2) {
                      // Set as secondary (can't select same role twice)
                      if (opt.value !== preferredRole) setPreferredRole2(opt.value)
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.875rem',
                    background: isPrimary
                      ? 'rgba(200,255,107,0.15)'
                      : isSecondary
                        ? 'rgba(245,158,11,0.12)'
                        : 'var(--color-elevated)',
                    border: `1px solid ${isPrimary ? 'var(--color-primary)' : isSecondary ? '#f59e0b' : 'var(--color-border)'}`,
                    borderRadius: 999,
                    cursor: 'pointer',
                    color: isPrimary ? 'var(--color-primary)' : isSecondary ? '#f59e0b' : 'var(--color-text-2)',
                    fontSize: '0.8125rem',
                    fontFamily: 'var(--font-display)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: isSelected ? 700 : 400,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>{opt.icon(isPrimary ? 'var(--color-primary)' : isSecondary ? '#f59e0b' : 'var(--color-text-2)')}</span>
                  <span>{opt.label}{isSecondary ? ' (2°)' : ''}</span>
                </button>
              )
            })}
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
            Seleziona fino a 2 ruoli. Il primo è il ruolo principale.
          </p>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isPending || !username.trim()}
        style={{
          padding: '0.875rem',
          background: 'var(--color-primary)',
          color: 'var(--color-bg)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-display)',
          fontSize: '0.9375rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          cursor: isPending ? 'default' : 'pointer',
          opacity: isPending ? 0.7 : 1,
          transition: 'opacity 0.15s ease',
        }}
      >
        {isPending ? 'Salvataggio…' : 'Salva Modifiche'}
      </button>
    </div>
  )
}
