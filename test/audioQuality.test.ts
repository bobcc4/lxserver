import assert from 'node:assert/strict'
import test from 'node:test'
import { getAudioQualityFormat, getUpstreamAudioContentType, hasUsableQualityEntry } from '../src/server/audioQuality'

const parseByteSize = (value: unknown) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined
}

test('rejects advertised qualities whose explicit size is empty or zero', () => {
  assert.equal(hasUsableQualityEntry({ size: null }, parseByteSize), false)
  assert.equal(hasUsableQualityEntry({ size: 0 }, parseByteSize), false)
  assert.equal(hasUsableQualityEntry({ filesize: '0' }, parseByteSize), false)
})

test('accepts qualities with a valid size or an explicit availability marker', () => {
  assert.equal(hasUsableQualityEntry({ size: 1_024 }, parseByteSize), true)
  assert.equal(hasUsableQualityEntry({ bitRate: 320 }, parseByteSize), true)
  assert.equal(hasUsableQualityEntry('128k', parseByteSize), true)
})

test('maps actual playback qualities to their real stream formats', () => {
  assert.deepEqual(getAudioQualityFormat('flac'), { suffix: 'flac', contentType: 'audio/flac' })
  assert.deepEqual(getAudioQualityFormat('128k'), { bitRate: 128, suffix: 'mp3', contentType: 'audio/mpeg' })
  assert.equal(getUpstreamAudioContentType('audio/mpeg; charset=binary', 'audio/flac'), 'audio/mpeg')
  assert.equal(getUpstreamAudioContentType('application/octet-stream', 'audio/flac'), 'audio/flac')
})
