import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  // Preserve every OAuth query parameter (including state) for PKCE verification.
  const redirectUrl = new URL(`/auth/callback-client${url.search}`, url.origin)
  return NextResponse.redirect(redirectUrl)
}
