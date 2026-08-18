const RESERVED_ADMIN_PATHS = new Set([
  'api',
  'rest',
  '_player',
  'music',
  'js',
  'assets',
  'vendor',
  'favicon.ico',
  'manifest.json',
  'sw.js',
])

export const DEFAULT_ADMIN_PATH = '/admin'

export const normalizeAdminPath = (value: unknown): string => {
  const raw = String(value ?? '').trim()
  if (!raw) return DEFAULT_ADMIN_PATH
  if (!raw.startsWith('/') || raw.includes('?') || raw.includes('#') || raw.includes('\\')) {
    throw new Error('管理页面路径必须是以 / 开头的路径，且不能包含查询参数或反斜杠')
  }

  const normalized = `/${raw.split('/').filter(Boolean).join('/')}`
  if (normalized === '/') throw new Error('管理页面路径不能使用根路径 /')

  const segments = normalized.slice(1).split('/')
  if (segments.some(segment => !/^[A-Za-z0-9._-]+$/.test(segment))) {
    throw new Error('管理页面路径只能包含字母、数字、点、下划线、短横线和斜杠')
  }
  if (RESERVED_ADMIN_PATHS.has(segments[0].toLowerCase())) {
    throw new Error('管理页面路径与系统保留路径冲突')
  }
  return normalized
}

export const isAdminPath = (pathname: string, adminPath: string): boolean => (
  pathname === adminPath || pathname.startsWith(`${adminPath}/`)
)
