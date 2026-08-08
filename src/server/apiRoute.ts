const API_PREFIX = '/api/v1'

/**
 * Maps the two legacy business API groups into the internal handlers.
 * The public contract is versioned; the old /api namespace is intentionally
 * not accepted by the HTTP server after the 1.4 migration.
 */
export const mapVersionedBusinessPath = (pathname: string): string | null => {
  const adminPrefix = `${API_PREFIX}/admin/`
  const playerPrefix = `${API_PREFIX}/player/`

  if (pathname.startsWith(adminPrefix)) {
    const suffix = pathname.slice(adminPrefix.length)
    if (suffix === 'reload') return '/api/admin/reload'
    return `/api/${suffix}`
  }

  if (pathname.startsWith(playerPrefix)) {
    const suffix = pathname.slice(playerPrefix.length)
    return suffix ? `/api/${suffix}` : '/api/music'
  }

  return null
}

export const isLegacyApiPath = (pathname: string) => (
  (pathname === '/api' || pathname.startsWith('/api/')) &&
  pathname !== API_PREFIX &&
  !pathname.startsWith(`${API_PREFIX}/`)
)
