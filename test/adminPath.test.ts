import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_ADMIN_PATH, isAdminPath, normalizeAdminPath } from '../src/adminPath'

test('admin path defaults and normalizes safely', () => {
  assert.equal(normalizeAdminPath(''), DEFAULT_ADMIN_PATH)
  assert.equal(normalizeAdminPath('/control-7f3a/'), '/control-7f3a')
  assert.equal(normalizeAdminPath('/my-console/entry'), '/my-console/entry')
  assert.equal(isAdminPath('/control-7f3a/', '/control-7f3a'), true)
  assert.equal(isAdminPath('/control-7f3a-other/', '/control-7f3a'), false)
})

test('admin path rejects root and reserved namespaces', () => {
  for (const value of ['/', '/api', '/rest', '/_player', '/music', '/js', '/assets']) {
    assert.throws(() => normalizeAdminPath(value))
  }
})
