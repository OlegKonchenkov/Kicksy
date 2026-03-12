'use client'

import { useMemo } from 'react'
import { useToast } from '@/components/ui'
import { Share2 } from 'lucide-react'

type InviteCodeCardProps = {
  groupId: string
  inviteCode: string
  inviteEnabled: boolean
}

export function InviteCodeCard({ groupId, inviteCode, inviteEnabled }: InviteCodeCardProps) {
  const { showToast } = useToast()

  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined') return `/groups/join?code=${encodeURIComponent(inviteCode)}`
    return `${window.location.origin}/groups/join?code=${encodeURIComponent(inviteCode)}`
  }, [groupId, inviteCode])

  async function copyCode() {
    await navigator.clipboard.writeText(inviteCode)
    showToast('Codice invito copiato', 'success')
  }

  async function shareInvite() {
    if (!inviteEnabled) {
      showToast('Link invito disattivato', 'error')
      return
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Kicksy - Invito gruppo',
          text: `Unisciti al gruppo con codice ${inviteCode}`,
          url: inviteLink,
        })
        return
      }

      await navigator.clipboard.writeText(inviteLink)
      showToast('Link invito copiato', 'success')
    } catch {
      showToast('Condivisione non riuscita', 'error')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.625rem 0.875rem',
        padding: '0.875rem 1rem',
        background: 'var(--color-elevated)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          color: 'var(--color-text-3)',
          fontFamily: 'var(--font-display)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 700,
        }}
      >
        Codice:
      </span>

      <button
        type="button"
        onClick={copyCode}
        title="Copia codice invito"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--color-primary)',
          letterSpacing: '0.12em',
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        {inviteCode}
      </button>

      <span style={{ fontSize: '0.75rem', color: inviteEnabled ? '#22c55e' : 'var(--color-danger)' }}>
        {inviteEnabled ? '• Attivo' : '• Disattivo'}
      </span>

      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
        <button
          type="button"
          onClick={copyCode}
          style={{
            padding: '0.35rem 0.7rem',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.7rem',
            color: 'var(--color-text-2)',
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Copia codice
        </button>

        <button
          type="button"
          onClick={shareInvite}
          disabled={!inviteEnabled}
          aria-label="Condividi invito gruppo"
          title="Condividi invito gruppo"
          style={{
            width: 32,
            height: 32,
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: inviteEnabled ? 'var(--color-text-2)' : 'var(--color-text-3)',
            cursor: inviteEnabled ? 'pointer' : 'default',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Share2 size={14} />
        </button>
      </div>
    </div>
  )
}
