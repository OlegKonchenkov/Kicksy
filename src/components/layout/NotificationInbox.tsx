'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCheck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui'
import type { Notification } from '@/types'

type NotificationItem = Pick<Notification, 'id' | 'type' | 'title' | 'body' | 'read' | 'created_at'>

function formatRelativeTime(dateISO: string) {
  const diffMs = Date.now() - new Date(dateISO).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'ora'
  if (mins < 60) return `${mins}m fa`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  return `${days}g fa`
}

export function NotificationInbox() {
  const supabase = useMemo(() => createClient(), [])
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const firstLoadDone = useRef(false)
  const topUnreadIdRef = useRef<string | null>(null)

  const loadNotifications = async () => {
    const [listRes, countRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, type, title, body, read, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false),
    ])

    if (!listRes.error) {
      const nextItems = (listRes.data ?? []) as NotificationItem[]
      setItems(nextItems)

      const topUnread = nextItems.find((n) => !n.read) ?? null
      if (firstLoadDone.current && topUnread && topUnread.id !== topUnreadIdRef.current && topUnread.type === 'xp_gain') {
        showToast(topUnread.title || 'Hai guadagnato XP', 'success')
      }
      topUnreadIdRef.current = topUnread?.id ?? null
      firstLoadDone.current = true
    }
    if (!countRes.error) {
      setUnreadCount(countRes.count ?? 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadNotifications()
    const id = window.setInterval(() => {
      void loadNotifications()
    }, 30000)
    return () => window.clearInterval(id)
  }, [])

  const markOneRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    await supabase.from('notifications').update({ read: true }).eq('id', id).eq('read', false)
  }

  const markAllRead = async () => {
    if (busy) return
    setBusy(true)
    const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false)
    if (!error) {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    }
    setBusy(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 'max(0.75rem, env(safe-area-inset-top))',
        right: 'max(0.75rem, env(safe-area-inset-right))',
        zIndex: 260,
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Apri notifiche"
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          border: '1px solid var(--color-border)',
          background: 'rgba(15, 19, 30, 0.92)',
          color: unreadCount > 0 ? 'var(--color-primary)' : 'var(--color-text-2)',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-card)',
          position: 'relative',
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -5,
              right: -5,
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              padding: '0 4px',
              background: 'var(--color-primary)',
              color: 'var(--color-bg)',
              fontSize: '0.625rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              display: 'grid',
              placeItems: 'center',
              border: '1px solid rgba(0,0,0,0.2)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            marginTop: '0.5rem',
            width: 'min(92vw, 360px)',
            background: 'rgba(11, 14, 22, 0.98)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 0.875rem',
              borderBottom: '1px solid var(--color-border)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-1)' }}>
              Notifiche
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <button
                onClick={markAllRead}
                disabled={busy || unreadCount === 0}
                aria-label="Segna tutte lette"
                style={{
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: unreadCount > 0 ? 'var(--color-primary)' : 'var(--color-text-3)',
                  borderRadius: 8,
                  width: 28,
                  height: 28,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: unreadCount > 0 ? 'pointer' : 'default',
                  opacity: unreadCount > 0 ? 1 : 0.5,
                }}
              >
                <CheckCheck size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Chiudi notifiche"
                style={{
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text-3)',
                  borderRadius: 8,
                  width: 28,
                  height: 28,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '0.875rem', color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>
                Caricamento...
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: '0.875rem', color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>
                Nessuna notifica.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) void markOneRead(n.id)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: n.read ? 'transparent' : 'rgba(200,255,107,0.08)',
                    color: 'var(--color-text-1)',
                    padding: '0.75rem 0.875rem',
                    cursor: n.read ? 'default' : 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: n.type === 'xp_gain' ? 'var(--color-primary)' : 'var(--color-text-1)' }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-3)', flexShrink: 0 }}>
                      {formatRelativeTime(n.created_at)}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.2rem', fontSize: '0.76rem', color: 'var(--color-text-2)', lineHeight: 1.4 }}>
                    {n.body}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

