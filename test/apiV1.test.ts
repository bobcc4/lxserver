import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeTrackId, signApiToken, verifySignedApiToken } from '../src/server/apiV1Contract'

test('API v1 token verifies its signature, type, and expiry', () => {
  const now = Math.floor(Date.now() / 1000)
  const token = signApiToken({ sub: 'admin', type: 'access', iat: now, exp: now + 60 }, 'secret')

  assert.equal(verifySignedApiToken(token, 'secret', 'access')?.sub, 'admin')
  assert.equal(verifySignedApiToken(token, 'wrong-secret', 'access'), null)
  assert.equal(verifySignedApiToken(token, 'secret', 'refresh'), null)
})

test('API v1 rejects expired and modified tokens', () => {
  const now = Math.floor(Date.now() / 1000)
  const expired = signApiToken({ sub: 'admin', type: 'access', iat: now - 120, exp: now - 60 }, 'secret')
  const valid = signApiToken({ sub: 'admin', type: 'access', iat: now, exp: now + 60 }, 'secret')

  assert.equal(verifySignedApiToken(expired, 'secret'), null)
  assert.equal(verifySignedApiToken(`${valid}changed`, 'secret'), null)
})

test('local track identifiers reject malformed payloads', () => {
  const valid = Buffer.from(JSON.stringify({ f: 'album/song.flac', d: 'music' })).toString('base64url')
  const traversalShape = Buffer.from(JSON.stringify({ f: '../song.flac', d: 'other' })).toString('base64url')

  assert.deepEqual(decodeTrackId(valid), { filename: 'album/song.flac', folder: 'music' })
  assert.equal(decodeTrackId(traversalShape), null)
  assert.equal(decodeTrackId('not-base64-json'), null)
})
