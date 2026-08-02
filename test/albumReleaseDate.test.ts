import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeAlbumText, resolveAlbumReleaseDate, sortAlbumsByReleaseDate } from '../src/server/utils/albumReleaseDate'

test('normalizes album names for cross-catalog matching', () => {
  assert.equal(normalizeAlbumText('心·跳 (2008)'), normalizeAlbumText('心跳（2008）'))
})

test('resolves a legacy album ID through current catalog search', async () => {
  const sdk = {
    tx: {
      extendDetail: { getAlbumSongs: async (id: string) => id === 'current-mid' ? { publishTime: '2015-07-24' } : Promise.reject(new Error('legacy')) },
      extendSearch: { searchAlbum: async () => ({ list: [{ id: 'current-mid', name: '力宏二十 20周年唯一精选', artist: '王力宏' }] }) },
    },
  }
  assert.equal(await resolveAlbumReleaseDate(sdk, { source: 'tx', id: '1047480', name: '力宏二十 20周年唯一精选', artist: '王力宏' }), '2015-07-24')
})

test('uses another catalog when the original source has no album detail', async () => {
  const sdk = {
    tx: {
      extendDetail: { getAlbumSongs: async () => ({ publishTime: '2005-12-30' }) },
      extendSearch: { searchAlbum: async () => ({ list: [{ id: 'tx-album', name: '盖世英雄', artist: '王力宏' }] }) },
    },
  }
  assert.equal(await resolveAlbumReleaseDate(sdk, { source: 'kw', id: '7954', name: '盖世英雄', artist: '王力宏' }), '2005-12-30')
})

test('sorts albums by full release date and leaves unknown dates last', () => {
  const albums = [
    { name: 'Unknown' },
    { name: 'Older', _releaseDate: '2008-12-26', year: 2008 },
    { name: 'Newest', _releaseDate: '2025-07-01', year: 2025 },
    { name: 'Year only', year: 2015 },
  ]
  assert.deepEqual(sortAlbumsByReleaseDate(albums).map(album => album.name), ['Newest', 'Year only', 'Older', 'Unknown'])
})
