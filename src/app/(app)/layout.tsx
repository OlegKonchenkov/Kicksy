import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/layout/BottomNav'
import { NotificationInbox } from '@/components/layout/NotificationInbox'
import { InstallAppButton } from '@/components/pwa/InstallAppButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 600,
        margin: '0 auto',
        position: 'relative',
        // Lifts the global ToastProvider above the bottom nav on app pages
        ['--toast-bottom' as string]: 'calc(58px + max(0.75rem, env(safe-area-inset-bottom)))',
      }}
    >
      {/* Main content — bottom padding accounts for nav bar */}
      <main
        style={{
          flex: 1,
          paddingTop: 'calc(40px + env(safe-area-inset-top) + 0.5rem)',
          paddingBottom: 'calc(58px + env(safe-area-inset-bottom))',
          overflowY: 'auto',
        }}
      >
        {children}
      </main>

      <NotificationInbox />
      <InstallAppButton />
      <BottomNav />
    </div>
  )
}
