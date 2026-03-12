import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')
  const nextParam = searchParams.get('next')
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/'

  if (oauthError) {
    const reason = oauthErrorDescription || oauthError
    return NextResponse.redirect(
      new URL(`/login?error=auth_callback_failed&reason=${encodeURIComponent(reason)}`, origin)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed&reason=missing_code', origin)
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=auth_callback_failed&reason=${encodeURIComponent(error.message)}`, origin)
    )
  }

  return NextResponse.redirect(new URL(next, origin))
}
