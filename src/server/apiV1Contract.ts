import crypto from 'node:crypto'

export interface ApiTokenPayload {
  sub: string
  type: 'access' | 'refresh' | 'media'
  exp: number
  iat: number
  trackId?: string
}

export const encodeApiValue = (value: Buffer | string) => Buffer.from(value).toString('base64url')

export const signApiToken = (payload: ApiTokenPayload, secret: string) => {
  const encoded = encodeApiValue(JSON.stringify(payload))
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

export const verifySignedApiToken = (
  token: string,
  secret: string,
  expectedType?: ApiTokenPayload['type'],
): ApiTokenPayload | null => {
  const [encoded, signature, extra] = String(token || '').split('.')
  if (!encoded || !signature || extra) return null
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest()
  let actual: Buffer
  try { actual = Buffer.from(signature, 'base64url') } catch { return null }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ApiTokenPayload
    if (!payload.sub || !payload.type || !Number.isFinite(payload.exp)) return null
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null
    if (expectedType && payload.type !== expectedType) return null
    return payload
  } catch {
    return null
  }
}

export const decodeTrackId = (id: string): { filename: string; folder: 'cache' | 'music'; location?: string } | null => {
  try {
    const value = JSON.parse(Buffer.from(id, 'base64url').toString('utf8'))
    if (!value || typeof value.f !== 'string' || !['cache', 'music'].includes(value.d)) return null
    const normalizedFilename = value.f.replace(/\\/g, '/')
    if (!normalizedFilename || normalizedFilename.startsWith('/') || normalizedFilename.split('/').includes('..') || /^[a-z]:/i.test(normalizedFilename)) return null
    return { filename: value.f, folder: value.d, ...(typeof value.l === 'string' ? { location: value.l } : {}) }
  } catch {
    return null
  }
}
