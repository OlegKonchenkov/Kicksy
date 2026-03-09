import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/layout/BottomNav'
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
      }}
    >
      {/* Main content — bottom padding accounts for nav bar */}
      <main
        style={{
          flex: 1,
          paddingBottom: 'calc(58px + env(safe-area-inset-bottom))',
          overflowY: 'auto',
        }}
      >
        {children}
      </main>

      <InstallAppButton />
      <BottomNav />
    </div>
  )
}
