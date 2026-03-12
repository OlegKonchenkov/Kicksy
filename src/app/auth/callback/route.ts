import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')

  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/'
  const redirectUrl = new URL('/auth/callback-client', origin)
  if (code) redirectUrl.searchParams.set('code', code)
  redirectUrl.searchParams.set('next', next)
  if (oauthError) redirectUrl.searchParams.set('error', oauthError)
  if (oauthErrorDescription) redirectUrl.searchParams.set('error_description', oauthErrorDescription)

  return NextResponse.redirect(redirectUrl)
}

