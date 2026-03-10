export function getMapsHref(location: string): string {
  const value = location.trim()
  if (!value) return ''

  try {
    const url = new URL(value)
    const protocol = url.protocol.toLowerCase()
    if (protocol === 'http:' || protocol === 'https:') {
      return url.toString()
    }
  } catch {
    // Not a valid absolute URL: fall back to query search.
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`
}
