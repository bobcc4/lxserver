export const API_V1_PREFIX = '/api/v1'

export type ApiNamespace = 'native' | 'admin' | 'player' | 'legacy' | 'none'

export const classifyApiNamespace = (pathname: string): ApiNamespace => {
  if (pathname === '/api' || (pathname.startsWith('/api/') && !pathname.startsWith(`${API_V1_PREFIX}/`))) {
    return 'legacy'
  }
  if (pathname === `${API_V1_PREFIX}/admin` || pathname.startsWith(`${API_V1_PREFIX}/admin/`)) {
    return 'admin'
  }
  // The media URL is consumed directly by a DLNA device and uses its own
  // short-lived session token. The control endpoints remain player APIs so
  // the existing Web player authentication continues to work.
  if (pathname.startsWith(`${API_V1_PREFIX}/cast/media/`)) return 'native'
  if (pathname === `${API_V1_PREFIX}/player` || pathname.startsWith(`${API_V1_PREFIX}/player/`)) {
    return 'player'
  }
  if (pathname === API_V1_PREFIX || pathname.startsWith(`${API_V1_PREFIX}/`)) {
    return 'native'
  }
  return 'none'
}
