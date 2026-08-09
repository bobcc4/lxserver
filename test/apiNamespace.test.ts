import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import path from 'node:path'
import { classifyApiNamespace } from '../src/server/apiNamespace'

test('classifies each API v1 namespace without rewriting paths', () => {
  assert.equal(classifyApiNamespace('/api/v1/auth/login'), 'native')
  assert.equal(classifyApiNamespace('/api/v1/library/tracks'), 'native')
  assert.equal(classifyApiNamespace('/api/v1/admin/status'), 'admin')
  assert.equal(classifyApiNamespace('/api/v1/player/music/search'), 'player')
})

test('rejects only the removed unversioned API namespace', () => {
  assert.equal(classifyApiNamespace('/api'), 'legacy')
  assert.equal(classifyApiNamespace('/api/login'), 'legacy')
  assert.equal(classifyApiNamespace('/api-v1'), 'none')
  assert.equal(classifyApiNamespace('/rest/ping.view'), 'none')
})

test('server route implementation uses versioned paths directly', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/server/server.ts'), 'utf8')
  assert.doesNotMatch(source, /pathname\s*(?:===|startsWith\()\s*['"`]\/api\/(?!v1)/)
  assert.match(source, /pathname === '\/api\/v1\/admin\/login'/)
  assert.match(source, /pathname === '\/api\/v1\/player\/music\/search'/)
})
