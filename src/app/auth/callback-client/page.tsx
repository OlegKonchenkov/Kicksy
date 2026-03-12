'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackClientPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
}

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function run() {
      const code = searchParams.get('code')
      const nextParam = searchParams.get('next')
      const next = nextParam && nextParam.startsWith('/') ? nextParam : '/'
      const oauthError = searchParams.get('error')
      const oauthErrorDescription = searchParams.get('error_description')

      if (oauthError) {
        const reason = oauthErrorDescription || oauthError
        router.replace(`/login?error=auth_callback_failed&reason=${encodeURIComponent(reason)}`)
        return
      }

      if (!code) {
        router.replace('/login?error=auth_callback_failed&reason=missing_code')
        return
      }

      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        router.replace(`/login?error=auth_callback_failed&reason=${encodeURIComponent(error.message)}`)
        return
      }

      router.replace(next)
    }

    void run()
  }, [router, searchParams])

  return <CallbackFallback />
}

function CallbackFallback() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-12 grain">
      <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>Accesso in corso...</p>
    </div>
  )
}

