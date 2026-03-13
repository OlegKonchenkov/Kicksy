'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui'
import { IconBell } from '@/components/ui/Icons'
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
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

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
      showToast('Tutte le notifiche segnate come lette', 'info')
    }
    setBusy(false)
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 'max(0.625rem, env(safe-area-inset-top))',
        right: 'max(0.75rem, env(safe-area-inset-right))',
        zIndex: 300,
      }}
    >
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Apri notifiche"
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          border: '1px solid var(--color-border)',
          background: 'rgba(15, 19, 30, 0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: unreadCount > 0 ? 'var(--color-primary)' : 'var(--color-text-3)',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          position: 'relative',
          transition: 'color 0.2s, border-color 0.2s',
        }}
      >
        <IconBell size={16} color={unreadCount > 0 ? 'var(--color-primary)' : 'var(--color-text-3)'} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              borderRadius: 999,
              padding: '0 3px',
              background: 'var(--color-primary)',
              color: 'var(--color-bg)',
              fontSize: '0.575rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              display: 'grid',
              placeItems: 'center',
              border: '2px solid var(--color-bg)',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            width: 'min(92vw, 340px)',
            background: 'rgba(11, 14, 22, 0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            animation: 'toast-enter 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
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
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-1)' }}>
              Notifiche
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={busy}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-display)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                    padding: '0.25rem 0.5rem',
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  Leggi tutte
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Chiudi notifiche"
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--color-text-3)',
                  width: 28,
                  height: 28,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '1.25rem', color: 'var(--color-text-3)', fontSize: '0.8125rem', textAlign: 'center' }}>
                Caricamento...
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: '1.25rem', color: 'var(--color-text-3)', fontSize: '0.8125rem', textAlign: 'center' }}>
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
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: n.read ? 'transparent' : 'rgba(200,255,107,0.06)',
                    color: 'var(--color-text-1)',
                    padding: '0.75rem 0.875rem',
                    cursor: n.read ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: n.type === 'xp_gain' ? 'var(--color-primary)' : 'var(--color-text-1)' }}>
                      {!n.read && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', marginRight: '0.375rem', verticalAlign: 'middle' }} />}
                      {n.title}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', flexShrink: 0 }}>
                      {formatRelativeTime(n.created_at)}
                    </span>
                  </div>
                  {n.body && (
                    <div style={{ marginTop: '0.2rem', fontSize: '0.73rem', color: 'var(--color-text-2)', lineHeight: 1.4 }}>
                      {n.body}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
