import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/env'

const PUBLIC_ROUTES = ['/login', '/auth/callback', '/auth/callback-client', '/invite', '/groups/join']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))

  // Let OAuth callbacks pass through untouched to avoid interfering with PKCE exchange.
  if (pathname.startsWith('/auth/callback') || pathname.startsWith('/auth/callback-client')) {
    return NextResponse.next({ request })
  }

  const supabaseUrl = getSupabaseUrl()
  const supabaseKey = getSupabasePublishableKey()

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Missing Supabase env vars in middleware. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).'
    )
    if (isPublic) return NextResponse.next({ request })
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'supabase_env_missing')
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && !isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const nextPath = `${pathname}${request.nextUrl.search}`
      url.searchParams.set('next', nextPath)
      return NextResponse.redirect(url)
    }

    if (user && pathname === '/login') {
      const next = request.nextUrl.searchParams.get('next')
      if (next && next.startsWith('/')) {
        return NextResponse.redirect(new URL(next, request.url))
      }
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  } catch (err) {
    console.error('Middleware auth check failed', err)
    if (isPublic) return NextResponse.next({ request })
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'auth_unavailable')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
