import assert from 'node:assert/strict'
import test from 'node:test'
import { networkPlaylistsAreEqual, parseNetworkPlaylistInterval } from '../src/server/networkPlaylistMonitorUtils'

test('network playlist monitor parses supported intervals and clamps short values', () => {
  assert.equal(parseNetworkPlaylistInterval('6h'), 6 * 60 * 60 * 1000)
  assert.equal(parseNetworkPlaylistInterval('30s'), 30 * 1000)
  assert.equal(parseNetworkPlaylistInterval('off'), 0)
  assert.equal(parseNetworkPlaylistInterval('invalid'), 6 * 60 * 60 * 1000)
})

test('network playlist monitor compares source and song ids in order', () => {
  const list = [{ source: 'tx', songmid: '1' }, { source: 'tx', songmid: '2' }]
  assert.equal(networkPlaylistsAreEqual(list, [{ source: 'tx', id: '1' }, { source: 'tx', id: '2' }]), true)
  assert.equal(networkPlaylistsAreEqual(list, [{ source: 'wy', songmid: '1' }, { source: 'tx', songmid: '2' }]), false)
  assert.equal(networkPlaylistsAreEqual(list, [...list].reverse()), false)
})
