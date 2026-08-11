import assert from 'node:assert/strict'
import test from 'node:test'
import { parseLyrics, serializeLyrics } from '../src/utils/lrcTool'

const wordLyrics = {
  lyric: '[00:10.000]你好',
  lxlyric: '[00:10.000]<0,500>你<500,500>好',
}

test('serializes canonical word lyrics as verbatim LRC', () => {
  const result = serializeLyrics(wordLyrics, 'word')
  assert.equal(result.actualFormat, 'word')
  assert.match(result.text, /^\[00:10\.000\]你\[00:10\.500\]好\[00:11\.000\]/)
})

test('serializes canonical word lyrics as enhanced LRC', () => {
  const result = serializeLyrics(wordLyrics, 'enhanced')
  assert.equal(result.actualFormat, 'enhanced')
  assert.match(result.text, /^\[00:10\.000\]<00:10\.000>你<00:10\.500>好<00:11\.000>/)
})

test('falls back to line LRC without inventing word timestamps', () => {
  const result = serializeLyrics({ lyric: '[00:10.000]你好' }, 'word')
  assert.equal(result.actualFormat, 'line')
  assert.equal(result.fallbackReason, '逐字歌词不可用，已降级为逐行歌词')
  assert.doesNotMatch(result.text, /<\d+,\d+>/)
})

test('keeps structured lyrics recoverable from serialized sidecar content', () => {
  const serialized = serializeLyrics(wordLyrics, 'enhanced')
  const parsed = parseLyrics(serialized.text)
  assert.equal(parsed.lyric, wordLyrics.lyric)
  assert.equal(parsed.lxlyric, wordLyrics.lxlyric)
})
