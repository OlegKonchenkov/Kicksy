import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { getSupabasePublicConfigOrThrow } from './env'

export function createClient() {
  const { url, key } = getSupabasePublicConfigOrThrow()

  return createBrowserClient<Database>(
    url,
    key
  )
}
