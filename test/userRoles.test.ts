import assert from 'node:assert/strict'
import test from 'node:test'
import { getUserIsAdmin, withUserRole } from '../src/userRoles'

test('legacy admin is migrated to an explicit role', () => {
  assert.equal(getUserIsAdmin({ name: 'admin' }), true)
  assert.deepEqual(withUserRole({ name: 'admin', password: 'x' }), {
    name: 'admin',
    password: 'x',
    isAdmin: true,
  })
})

test('explicit roles survive username changes', () => {
  assert.equal(getUserIsAdmin({ name: 'admin1', isAdmin: true }), true)
  assert.equal(getUserIsAdmin({ name: 'admin', isAdmin: false }), false)
  assert.equal(getUserIsAdmin({ name: 'xiangyun' }), false)
})
