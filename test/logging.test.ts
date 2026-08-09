import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeAccessUrl, sanitizeLogText } from '../src/utils/log4js'

test('redacts credentials and tokens from access log URLs', () => {
  const url = sanitizeAccessUrl('/rest/stream.view?u=admin&p=password&t=token-hash&s=salt&id=tx_123')

  assert.equal(url, '/rest/stream.view?u=admin&p=REDACTED&t=REDACTED&s=REDACTED&id=tx_123')
})

test('keeps non-sensitive access log parameters available for diagnostics', () => {
  const url = sanitizeAccessUrl('/api/v1/player/music/search?source=tx&name=%E5%A4%9C%E6%9B%B2&page=1')

  assert.equal(url, '/api/v1/player/music/search?source=tx&name=%E5%A4%9C%E6%9B%B2&page=1')
})

test('redacts credentials embedded in diagnostic text', () => {
  const text = sanitizeLogText('download https://user:pass@example.com/file?vkey=secret&source=tx token=abc123 {"password":"hidden"}')

  assert.equal(text, 'download https://REDACTED:REDACTED@example.com/file?vkey=REDACTED&source=tx token=REDACTED {"password":"REDACTED"}')
})
