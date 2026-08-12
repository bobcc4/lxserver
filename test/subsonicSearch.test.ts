import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LEGACY_SUBSONIC_SOURCE_PRIORITY_VALUE,
  migrateLegacySubsonicSourcePriority,
  normalizeSubsonicSourcePriority,
  sortSubsonicSongResults,
  SUBSONIC_SOURCE_PRIORITY,
  SUBSONIC_SOURCE_PRIORITY_VALUE,
} from '../src/server/subsonicSearch'

const result = (id: string, name: string, singer: string, source: string, quality: string, listId = 'online') => ({
  music: { id, name, singer, source, quality },
  listId,
})

test('uses the configured Subsonic source order and removes invalid duplicates', () => {
  assert.deepEqual(normalizeSubsonicSourcePriority('tx,wy,tx,bad,kw,kg,mg'), [...SUBSONIC_SOURCE_PRIORITY])
})

test('migrates only the previous default Subsonic source order', () => {
  assert.equal(migrateLegacySubsonicSourcePriority(LEGACY_SUBSONIC_SOURCE_PRIORITY_VALUE), SUBSONIC_SOURCE_PRIORITY_VALUE)
  assert.equal(migrateLegacySubsonicSourcePriority('wy,tx'), 'wy,tx')
})

test('sorts exact title and artist matches before local, source and quality preferences', () => {
  const sorted = sortSubsonicSongResults([
    result('local-fuzzy', '我们的歌 Live', '王力宏', 'tx', 'master', 'local_music'),
    result('wy-exact', '我们的歌', '王力宏', 'wy', 'master'),
    result('tx-exact-low', '我们的歌', '王力宏', 'tx', '128k'),
    result('tx-exact-high', '我们的歌', '王力宏', 'tx', 'flac'),
  ], '我们的歌 王力宏', SUBSONIC_SOURCE_PRIORITY)

  assert.deepEqual(sorted.map(item => item.music.id), [
    'tx-exact-high',
    'tx-exact-low',
    'wy-exact',
    'local-fuzzy',
  ])
})

test('keeps fuzzy Subsonic results after exact matches', () => {
  const sorted = sortSubsonicSongResults([
    result('fuzzy', '我们的歌 Live', '王力宏', 'tx', 'flac'),
    result('exact', '我们的歌', '王力宏', 'wy', '128k'),
  ], '我们的歌', SUBSONIC_SOURCE_PRIORITY)

  assert.deepEqual(sorted.map(item => item.music.id), ['exact', 'fuzzy'])
})

test('prefers a downloaded song when match quality is equal', () => {
  const sorted = sortSubsonicSongResults([
    result('online', '我们的歌', '王力宏', 'tx', 'master'),
    result('local', '我们的歌', '王力宏', 'wy', 'flac', 'local_music'),
  ], '我们的歌', SUBSONIC_SOURCE_PRIORITY)

  assert.deepEqual(sorted.map(item => item.music.id), ['local', 'online'])
})
