import assert from 'node:assert/strict'
import test from 'node:test'

const { buildSingleTrackPlayback, isSongCollected } = require('../public/music/js/web_player_state.js')

test('single playlist playback never falls back to an unrelated default list', () => {
  const list = [{ id: 'one' }, { id: 'two' }]
  assert.deepEqual(buildSingleTrackPlayback(list, 1, false), { list: [{ id: 'two' }], index: 0 })
  assert.deepEqual(buildSingleTrackPlayback(list, 1, true), { list, index: 1 })
})

test('favorite state includes both the love list and user playlists', () => {
  const data = {
    loveList: [{ id: 'love-song' }],
    userList: [{ id: 'playlist', list: [{ id: 'playlist-song' }] }],
  }
  assert.equal(isSongCollected(data, 'love-song'), true)
  assert.equal(isSongCollected(data, 'playlist-song'), true)
  assert.equal(isSongCollected(data, 'missing'), false)
})
