import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLyricsResponse } from '../src/server/utils/apiLyrics'

test('API v1 flattens parsed local lyrics into a string content field', () => {
  const value = normalizeLyricsResponse({
    lyric: '[00:01.00]歌词',
    lrc: '[00:01.00]歌词',
    tlyric: '',
  }, 'sidecar')
  assert.equal(value.content, '[00:01.00]歌词')
  assert.equal(value.source, 'sidecar')
  assert.equal(value.tlyric, '')
})
