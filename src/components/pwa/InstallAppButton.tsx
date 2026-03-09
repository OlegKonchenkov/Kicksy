'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window.navigator as any).standalone === true)
    setIsStandalone(standalone)

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const onAppInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (isStandalone || !deferredPrompt) return null

  return (
    <button
      type="button"
      onClick={handleInstall}
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: 'calc(72px + env(safe-area-inset-bottom))',
        zIndex: 60,
        border: '1px solid rgba(200,255,107,.5)',
        background: 'linear-gradient(180deg, rgba(200,255,107,.16), rgba(200,255,107,.08))',
        color: 'var(--color-primary)',
        borderRadius: 999,
        padding: '0.45rem 0.75rem',
        fontFamily: 'var(--font-display)',
        fontSize: '0.72rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        boxShadow: '0 0 22px rgba(200,255,107,.14)',
        cursor: 'pointer',
      }}
    >
      Installa app
    </button>
  )
}

