import assert from 'node:assert/strict'
import test from 'node:test'
import { getPlaybackResolver, registerPlaybackResolver, resolveOriginalPlatformFirst } from '../src/server/playbackResolverRegistry'

test('shares the registered playback resolver with protocol adapters', async () => {
  const calls: string[] = []
  registerPlaybackResolver(async (song, quality) => {
    calls.push(`${song.source}/${quality}`)
    return { url: 'https://example.test/audio', quality: '128k', songInfo: song }
  })

  const result = await getPlaybackResolver()({ source: 'tx' }, 'flac', 'admin', true)
  assert.equal(result.quality, '128k')
  assert.deepEqual(calls, ['tx/flac'])
})

test('tries every lower quality on the original platform before switching platforms', async () => {
  const calls: string[] = []
  const qualities = ['flac', '320k', '128k']
  const result = await resolveOriginalPlatformFirst(
    qualities,
    { source: 'tx' },
    async() => [{ source: 'wy' }],
    async (quality, songs) => {
      calls.push(...songs.map(song => `${song.source}/${quality}`))
      return songs[0].source === 'wy' && quality === 'flac' ? 'resolved' : null
    },
  )

  assert.equal(result, 'resolved')
  assert.deepEqual(calls, ['tx/flac', 'tx/320k', 'tx/128k', 'wy/flac'])
})
