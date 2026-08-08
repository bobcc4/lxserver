import assert from 'node:assert/strict'
import test from 'node:test'
import { isLegacyApiPath, mapVersionedBusinessPath } from '../src/server/apiRoute'

test('maps versioned admin routes to the mature internal handlers', () => {
  assert.equal(mapVersionedBusinessPath('/api/v1/admin/login'), '/api/login')
  assert.equal(mapVersionedBusinessPath('/api/v1/admin/admin/reload'), '/api/admin/reload')
  assert.equal(mapVersionedBusinessPath('/api/v1/admin/elfinder/connector'), '/api/elfinder/connector')
  assert.equal(mapVersionedBusinessPath('/api/v1/admin/reload'), '/api/admin/reload')
})

test('maps versioned player routes without changing their business grouping', () => {
  assert.equal(mapVersionedBusinessPath('/api/v1/player/music/search'), '/api/music/search')
  assert.equal(mapVersionedBusinessPath('/api/v1/player/user/login'), '/api/user/login')
  assert.equal(mapVersionedBusinessPath('/api/v1/player/custom-source/list'), '/api/custom-source/list')
})

test('does not intercept native API v1 or Subsonic routes', () => {
  assert.equal(mapVersionedBusinessPath('/api/v1/auth/login'), null)
  assert.equal(mapVersionedBusinessPath('/api/v1/library/tracks'), null)
  assert.equal(mapVersionedBusinessPath('/rest/ping.view'), null)
})

test('recognizes only the removed unversioned API namespace', () => {
  assert.equal(isLegacyApiPath('/api/login'), true)
  assert.equal(isLegacyApiPath('/api'), true)
  assert.equal(isLegacyApiPath('/api/v1/auth/login'), false)
  assert.equal(isLegacyApiPath('/api/v1/admin/status'), false)
  assert.equal(isLegacyApiPath('/api-v1'), false)
  assert.equal(isLegacyApiPath('/rest/ping.view'), false)
})
