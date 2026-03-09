import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const AVATAR_BUCKET = 'avatars'
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024

const ALLOWED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
])

function getExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && fromName.length <= 5) return fromName

  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/avif') return 'avif'
  return 'jpg'
}

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return 'Formato non supportato. Usa JPG, PNG, WEBP o AVIF.'
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'Immagine troppo grande. Massimo 5MB.'
  }
  return null
}

export async function uploadAvatarImage(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File
) {
  const ext = getExtension(file)
  const path = `${userId}/avatar-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    })

  if (uploadError) return { url: null, error: uploadError.message }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
