import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSongInfo } from '../src/server/utils/songInfo'

test('normalizes an API v1 track wrapper for cross-platform source matching', () => {
  const normalized = normalizeSongInfo({
    id: 'wy_1301736461',
    title: '爱错',
    artist: '王力宏',
    album: '恋爱占星音乐全精选',
    source: 'wy',
    duration: '03:58',
    raw: {
      songmid: 1301736461,
      name: '爱错',
      singer: '王力宏',
      albumName: '恋爱占星音乐全精选',
      source: 'wy',
      interval: '03:58',
    },
  })

  assert.equal(normalized.name, '爱错')
  assert.equal(normalized.singer, '王力宏')
  assert.equal(normalized.albumName, '恋爱占星音乐全精选')
  assert.equal(normalized.interval, '03:58')
  assert.equal(normalized.songmid, 1301736461)
  assert.equal(normalized.source, 'wy')
})

test('preserves canonical fields while filling SDK metadata aliases', () => {
  const normalized = normalizeSongInfo({
    name: '原名称',
    source: 'tx',
    id: 'tx_001abc',
    raw: { name: '包装名称', singer: '歌手', strMediaMid: 'media-mid' },
    meta: { albumName: '专辑', qualitys: ['flac'] },
  })

  assert.equal(normalized.name, '原名称')
  assert.equal(normalized.singer, '歌手')
  assert.equal(normalized.albumName, '专辑')
  assert.equal(normalized.songmid, '001abc')
  assert.equal(normalized.strMediaMid, 'media-mid')
  assert.deepEqual(normalized.types, ['flac'])
})
