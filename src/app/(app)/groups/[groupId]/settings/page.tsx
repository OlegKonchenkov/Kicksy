'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui'
import {
  getGroupDetails,
  updateGroupSettings,
  regenerateInviteCode,
  removeMember,
  promoteMember,
  leaveGroup,
} from '@/lib/actions/groups'

interface Member {
  user_id: string
  role: 'admin' | 'member'
  display_name: string | null
  is_active: boolean
  profile: {
    username: string
    full_name: string | null
    avatar_url: string | null
    xp: number
    level: number
  }
}

interface GroupData {
  id: string
  name: string
  description: string | null
  invite_code: string
  invite_link_enabled: boolean
  max_members: number | null
  created_by: string
  myRole: 'admin' | 'member'
  members: Member[]
}

export default function GroupSettingsPage() {
  const params = useParams()
  const groupId = params.groupId as string
  const router = useRouter()

  const [group, setGroup] = useState<GroupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inviteEnabled, setInviteEnabled] = useState(true)
  const [inviteCode, setInviteCode] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    getGroupDetails(groupId).then(res => {
      if (res.error || !res.data) {
        setPageError(res.error ?? 'Gruppo non trovato')
        setLoading(false)
        return
      }
      const g = res.data
      if (g.myRole !== 'admin') {
        router.replace(`/groups/${groupId}`)
        return
      }
      setGroup(g)
      setName(g.name)
      setDescription(g.description ?? '')
      setInviteEnabled(g.invite_link_enabled)
      setInviteCode(g.invite_code)
      setLoading(false)
    })
  }, [groupId, router])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setActionError(null)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleSaveInfo = () => {
    startTransition(async () => {
      const res = await updateGroupSettings(groupId, {
        name: name.trim(),
        description: description.trim() || null,
      })
      if (res.error) setActionError(res.error)
      else showSuccess('Informazioni aggiornate!')
    })
  }

  const handleToggleInvite = (enabled: boolean) => {
    setInviteEnabled(enabled)
    startTransition(async () => {
      await updateGroupSettings(groupId, { invite_link_enabled: enabled })
    })
  }

  const handleRegenerateCode = () => {
    startTransition(async () => {
      const res = await regenerateInviteCode(groupId)
      if (res.data) {
        setInviteCode(res.data)
        showSuccess('Codice rigenerato!')
      }
    })
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(inviteCode)
    showSuccess('Codice copiato!')
  }

  const handleRemoveMember = (userId: string) => {
    startTransition(async () => {
      const res = await removeMember(groupId, userId)
      if (res.error) setActionError(res.error)
      else {
        setGroup(prev => prev ? {
          ...prev,
          members: prev.members.filter(m => m.user_id !== userId),
        } : prev)
        showSuccess('Membro rimosso')
      }
    })
  }

  const handlePromoteMember = (userId: string) => {
    startTransition(async () => {
      const res = await promoteMember(groupId, userId)
      if (res.error) setActionError(res.error)
      else {
        setGroup(prev => prev ? {
          ...prev,
          members: prev.members.map(m => m.user_id === userId ? { ...m, role: 'admin' as const } : m),
        } : prev)
        showSuccess('Membro promosso admin!')
      }
    })
  }

  const handleLeave = () => {
    if (!confirm('Sei sicuro di voler abbandonare il gruppo?')) return
    startTransition(async () => {
      const res = await leaveGroup(groupId)
      if (res.error) setActionError(res.error)
      else router.push('/groups')
    })
  }

  const sectionTitle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--color-text-3)',
    marginBottom: '0.875rem',
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
    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
      <span style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>Caricamento…</span>
    </div>
  )

  if (pageError) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{pageError}</p>
      <Link href="/groups" style={{ color: 'var(--color-primary)', fontSize: '0.875rem' }}>← Torna ai gruppi</Link>
    </div>
  )

  if (!group) return null

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href={`/groups/${groupId}`} style={{ color: 'var(--color-text-3)', fontSize: '1.25rem', textDecoration: 'none', lineHeight: 1 }}>
          ←
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
          Impostazioni
        </h1>
      </div>

      {/* Feedback banners */}
      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: '#22c55e', fontWeight: 600 }}>
          ✓ {successMsg}
        </div>
      )}
      {actionError && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-danger)' }}>
          {actionError}
        </div>
      )}

      {/* Group info */}
      <section>
        <p style={sectionTitle}>Informazioni Gruppo</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.375rem' }}>
              Nome
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={60}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.375rem' }}>
              Descrizione
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={200}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            />
          </div>
          <button
            onClick={handleSaveInfo}
            disabled={isPending || !name.trim()}
            style={{ alignSelf: 'flex-end', padding: '0.625rem 1.25rem', background: 'var(--color-primary)', color: 'var(--color-bg)', border: 'none', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: isPending ? 'default' : 'pointer', opacity: isPending ? 0.6 : 1 }}
          >
            {isPending ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </section>

      {/* Invite settings */}
      <section>
        <p style={sectionTitle}>Link di Invito</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.9375rem', color: 'var(--color-text-1)', fontWeight: 600 }}>Link attivo</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.125rem' }}>Permetti ai nuovi membri di unirsi col codice</div>
            </div>
            <button
              onClick={() => handleToggleInvite(!inviteEnabled)}
              disabled={isPending}
              aria-label="Toggle invite link"
              style={{ width: 48, height: 26, borderRadius: 999, border: 'none', background: inviteEnabled ? 'var(--color-primary)' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <div style={{ position: 'absolute', top: 3, left: inviteEnabled ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: inviteEnabled ? 'var(--color-bg)' : 'var(--color-text-3)', transition: 'left 0.2s' }} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'var(--color-elevated)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.12em', flex: 1 }}>
              {inviteCode}
            </span>
            <button
              onClick={handleCopyCode}
              style={{ padding: '0.375rem 0.75rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              Copia
            </button>
          </div>

          <button
            onClick={handleRegenerateCode}
            disabled={isPending}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-text-2)', cursor: isPending ? 'default' : 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: isPending ? 0.6 : 1 }}
          >
            🔄 Rigenera codice
          </button>
        </div>
      </section>

      {/* Members list */}
      <section>
        <p style={sectionTitle}>Membri ({group.members.length})</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {group.members.map(m => {
            const isCreator = m.user_id === group.created_by
            const displayName = m.profile.full_name ?? m.profile.username
            return (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <Avatar src={m.profile.avatar_url} name={displayName} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                    {isCreator && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Fondatore
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: m.role === 'admin' ? 'var(--color-primary)' : 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                    {m.role === 'admin' ? '⭐ Admin' : 'Membro'}
                  </div>
                </div>
                {!isCreator && (
                  <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                    {m.role === 'member' && (
                      <button
                        onClick={() => handlePromoteMember(m.user_id)}
                        disabled={isPending}
                        style={{ padding: '0.375rem 0.625rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--color-primary)', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                      >
                        ↑ Admin
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      disabled={isPending}
                      style={{ padding: '0.375rem 0.625rem', background: 'transparent', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--color-danger)', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                    >
                      Rimuovi
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <p style={{ ...sectionTitle, color: 'var(--color-danger)' }}>Zona Pericolosa</p>
        <div style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)' }}>Lascia il gruppo</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.125rem' }}>Non potrai tornare senza un nuovo invito</div>
          </div>
          <button
            onClick={handleLeave}
            disabled={isPending}
            style={{ padding: '0.625rem 1rem', background: 'transparent', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--color-danger)', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Esci
          </button>
        </div>
      </section>
    </div>
  )
}
