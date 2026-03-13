'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui'
import { IconRefresh } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'
import { uploadGroupImage, validateAvatarFile } from '@/lib/avatar-upload'
import {
  getGroupDetails,
  getGroupPollTemplateSettings,
  updateGroupSettings,
  regenerateInviteCode,
  removeMember,
  promoteMember,
  demoteMember,
  leaveGroup,
  setGroupPollTemplateEnabled,
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
  isFounder: boolean
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
  const [groupAvatarUrl, setGroupAvatarUrl] = useState<string | null>(null)
  const [inviteEnabled, setInviteEnabled] = useState(true)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pollTemplates, setPollTemplates] = useState<Array<{
    template_id: string
    question_it: string
    is_enabled: boolean
    is_global: boolean
  }>>([])

  useEffect(() => {
    ;(async () => {
      const res = await getGroupDetails(groupId)
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
      setGroupAvatarUrl(g.avatar_url ?? null)
      setInviteEnabled(g.invite_link_enabled)
      setInviteCode(g.invite_code)
      setInviteLink(makeInviteLink(g.invite_code))

      const pollsRes = await getGroupPollTemplateSettings(groupId)
      if (pollsRes.data) setPollTemplates(pollsRes.data)
      setLoading(false)
    })()
  }, [groupId, router])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setActionError(null)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const makeInviteLink = (code: string) => {
    if (!code) return ''
    if (typeof window === 'undefined') return `/groups/join?code=${encodeURIComponent(code)}`
    return `${window.location.origin}/groups/join?code=${encodeURIComponent(code)}`
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

  const handleGroupAvatarUpload = (file: File) => {
    const validation = validateAvatarFile(file)
    if (validation) {
      setActionError(validation)
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setActionError('Sessione scaduta. Rieffettua il login.')
        return
      }

      const { url, error } = await uploadGroupImage(supabase, user.id, groupId, file)
      if (error || !url) {
        setActionError(error ?? 'Upload immagine fallito')
        return
      }

      const saveRes = await updateGroupSettings(groupId, { avatar_url: url })
      if (saveRes.error) {
        setActionError(saveRes.error)
        return
      }

      setGroupAvatarUrl(url)
      setGroup((prev) => (prev ? { ...prev, avatar_url: url } : prev))
      showSuccess('Immagine squadra aggiornata!')
    })
  }

  const handleGroupAvatarRemove = () => {
    startTransition(async () => {
      const res = await updateGroupSettings(groupId, { avatar_url: null })
      if (res.error) {
        setActionError(res.error)
        return
      }
      setGroupAvatarUrl(null)
      setGroup((prev) => (prev ? { ...prev, avatar_url: null } : prev))
      showSuccess('Immagine squadra rimossa')
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
        setInviteLink(makeInviteLink(res.data))
        showSuccess('Codice rigenerato!')
      }
    })
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(inviteCode)
    showSuccess('Codice copiato!')
  }

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    showSuccess('Link invito copiato!')
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

  const handleDemoteMember = (userId: string) => {
    startTransition(async () => {
      const res = await demoteMember(groupId, userId)
      if (res.error) setActionError(res.error)
      else {
        setGroup(prev => prev ? {
          ...prev,
          members: prev.members.map(m => m.user_id === userId ? { ...m, role: 'member' as const } : m),
        } : prev)
        showSuccess('Permessi admin revocati')
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

  const handleTogglePollTemplate = (templateId: string, enabled: boolean) => {
    setPollTemplates((prev) => prev.map((p) => p.template_id === templateId ? { ...p, is_enabled: enabled } : p))
    startTransition(async () => {
      const res = await setGroupPollTemplateEnabled(groupId, templateId, enabled)
      if (res.error) {
        setActionError(res.error)
        setPollTemplates((prev) => prev.map((p) => p.template_id === templateId ? { ...p, is_enabled: !enabled } : p))
      } else {
        showSuccess('Template votazioni aggiornati')
      }
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
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.625rem' }}>
              Immagine Squadra
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Avatar src={groupAvatarUrl} name={name || group.name} size="lg" />
              <label
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-elevated)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  color: 'var(--color-text-2)',
                  fontFamily: 'var(--font-display)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Carica
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    handleGroupAvatarUpload(file)
                    e.currentTarget.value = ''
                  }}
                  style={{ display: 'none' }}
                />
              </label>
              {groupAvatarUrl && (
                <button
                  type="button"
                  onClick={handleGroupAvatarRemove}
                  disabled={isPending}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--color-text-3)',
                    fontSize: '0.75rem',
                    cursor: isPending ? 'default' : 'pointer',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--color-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.8125rem', color: inviteEnabled ? 'var(--color-text-2)' : 'var(--color-text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {inviteLink}
            </span>
            <button
              onClick={handleCopyInviteLink}
              disabled={!inviteEnabled || !inviteLink}
              style={{ padding: '0.375rem 0.75rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: inviteEnabled ? 'var(--color-text-2)' : 'var(--color-text-3)', cursor: inviteEnabled ? 'pointer' : 'default', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              Copia link
            </button>
          </div>

          <button
            onClick={handleRegenerateCode}
            disabled={isPending}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-text-2)', cursor: isPending ? 'default' : 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: isPending ? 0.6 : 1 }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}><IconRefresh size={13} color="var(--color-text-2)" /> Rigenera codice</span>
          </button>
        </div>
      </section>

      {/* Poll templates */}
      <section>
        <p style={sectionTitle}>Votazioni Post-Partita</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-3)', lineHeight: 1.45 }}>
            Attiva/disattiva i sondaggi automatici che si aprono a fine partita (oltre al voto MVP).
          </p>

          {pollTemplates.length === 0 ? (
            <div style={{ padding: '0.75rem 0', fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
              Nessun template disponibile.
            </div>
          ) : (
            pollTemplates.map((tpl) => (
              <div
                key={tpl.template_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem 0.875rem',
                  background: 'var(--color-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-1)', fontWeight: 600, lineHeight: 1.35 }}>
                    {tpl.question_it}
                  </div>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {tpl.is_global ? 'Globale' : 'Gruppo'}
                  </div>
                </div>

                <button
                  onClick={() => handleTogglePollTemplate(tpl.template_id, !tpl.is_enabled)}
                  disabled={isPending}
                  aria-label={`Toggle template ${tpl.question_it}`}
                  style={{
                    width: 48,
                    height: 26,
                    borderRadius: 999,
                    border: 'none',
                    background: tpl.is_enabled ? 'var(--color-primary)' : 'var(--color-border)',
                    cursor: isPending ? 'default' : 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                    opacity: isPending ? 0.7 : 1,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: tpl.is_enabled ? 25 : 3,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: tpl.is_enabled ? 'var(--color-bg)' : 'var(--color-text-3)',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Members list */}
      <section>
        <p style={sectionTitle}>Membri ({group.members.length})</p>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
          Gli admin possono gestire gruppo e partite, ma solo il fondatore puo eliminare il gruppo.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {group.members.map(m => {
            const isCreator = m.user_id === group.created_by
            const displayName = m.profile.full_name ?? m.profile.username
            const canRemoveMember = m.role === 'member' || group.isFounder
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
                    {m.role === 'admin' ? 'Admin' : 'Membro'}
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
                        Rendi admin
                      </button>
                    )}
                    {m.role === 'admin' && group.isFounder && (
                      <button
                        onClick={() => handleDemoteMember(m.user_id)}
                        disabled={isPending}
                        style={{ padding: '0.375rem 0.625rem', background: 'transparent', border: '1px solid #f59e0b', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: '#f59e0b', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                      >
                        Revoca admin
                      </button>
                    )}
                    {canRemoveMember && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        disabled={isPending}
                        style={{ padding: '0.375rem 0.625rem', background: 'transparent', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--color-danger)', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                      >
                        Rimuovi
                      </button>
                    )}
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




