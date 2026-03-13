'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { IconEdit, IconSoccerBall, IconShield, IconBell, IconLogout } from '@/components/ui/Icons'

export default function ProfileSettingsPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSignOut = () => {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    })
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    textDecoration: 'none',
    gap: '0.75rem',
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

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href="/profile" style={{ color: 'var(--color-text-3)', fontSize: '1.25rem', textDecoration: 'none', lineHeight: 1 }}>
          ←
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
          Impostazioni
        </h1>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      {/* Account section */}
      <section>
        <p style={sectionTitle}>Account</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/profile/edit" style={{ ...rowStyle, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}><IconEdit size={20} color="var(--color-text-2)" /></span>
              <div>
                <div style={{ fontSize: '0.9375rem', color: 'var(--color-text-1)', fontWeight: 600 }}>Modifica profilo</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.125rem' }}>Nome, username, ruolo preferito</div>
              </div>
            </div>
            <span style={{ color: 'var(--color-text-3)', fontSize: '1.1rem' }}>›</span>
          </Link>
        </div>
      </section>

      {/* App info section */}
      <section>
        <p style={sectionTitle}>App</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ ...rowStyle, cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}><IconSoccerBall size={20} color="var(--color-text-2)" /></span>
              <div>
                <div style={{ fontSize: '0.9375rem', color: 'var(--color-text-1)', fontWeight: 600 }}>Kicksy</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.125rem' }}>Versione 1.0.0</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section>
        <p style={sectionTitle}>Notifiche</p>
        <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}><IconBell size={20} color="var(--color-text-2)" /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9375rem', color: 'var(--color-text-1)', fontWeight: 600 }}>Notifiche push</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.125rem' }}>Presto disponibile</div>
            </div>
            <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: 'var(--color-elevated)', borderRadius: 999, color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              WIP
            </span>
          </div>
        </div>
      </section>

      {/* Sign out */}
      <section>
        <p style={sectionTitle}>Sessione</p>
        <button
          onClick={handleSignOut}
          disabled={isPending}
          style={{ ...rowStyle, width: '100%', cursor: isPending ? 'default' : 'pointer', border: '1px solid var(--color-border)', opacity: isPending ? 0.6 : 1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}><IconLogout size={20} color="var(--color-danger)" /></span>
            <div style={{ fontSize: '0.9375rem', color: 'var(--color-danger)', fontWeight: 600 }}>Disconnetti</div>
          </div>
        </button>
      </section>

      {/* Danger zone */}
      <section>
        <p style={{ ...sectionTitle, color: 'var(--color-danger)' }}>Zona Pericolosa</p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ ...rowStyle, width: '100%', cursor: 'pointer', borderColor: 'var(--color-danger)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}><IconShield size={20} color="var(--color-danger)" /></span>
              <div>
                <div style={{ fontSize: '0.9375rem', color: 'var(--color-danger)', fontWeight: 600 }}>Elimina account</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.125rem' }}>Azione irreversibile</div>
              </div>
            </div>
          </button>
        ) : (
          <div style={{ padding: '1.25rem', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-danger)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-1)', lineHeight: 1.5 }}>
              Sei sicuro? Tutti i tuoi dati, statistiche e badge verranno eliminati permanentemente.
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
              Per eliminare l&apos;account contatta il supporto a <strong style={{ color: 'var(--color-text-2)' }}>support@kicksy.app</strong>
            </p>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ padding: '0.625rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              Annulla
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
