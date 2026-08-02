import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { ACCOUNT_SYNC_MAX_BYTES, ACCOUNT_SYNC_SCHEMA_VERSION } from '../src/server/accountSyncContract'

test('account sync contract uses a versioned bounded snapshot', () => {
  assert.equal(ACCOUNT_SYNC_SCHEMA_VERSION, 1)
  assert.equal(ACCOUNT_SYNC_MAX_BYTES, 12 * 1024 * 1024)
})

test('account snapshots restore data and reject unsafe or conflicting restores', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yinyun-account-sync-'))
  const dataPath = path.join(root, 'data')
  const userPath = path.join(dataPath, 'users')
  fs.mkdirSync(userPath, { recursive: true })

  global.lx = {
    dataPath,
    userPath,
    logPath: path.join(root, 'logs'),
    staticPath: path.join(root, 'public'),
    config: {
      users: [
        { name: 'restore', password: 'secret' },
        { name: 'invalid', password: 'secret' },
        { name: 'oversize', password: 'secret' },
      ],
      maxSnapshotNum: 10,
      'list.addMusicLocationType': 'bottom',
    } as LX.Config,
    saveConfig: () => {},
  }

  const { buildAccountSyncSnapshot, restoreAccountSyncSnapshot } = await import('../src/server/accountSync')
  const { getUserSpace, releaseUserSpace } = await import('../src/user')

  try {
    const empty = await buildAccountSyncSnapshot('restore')
    assert.equal(empty.empty, true)
    assert.deepEqual(empty.stats, {
      playlists: 0,
      tracks: 0,
      dislikeRules: 0,
      sources: 0,
      favoriteArtists: 0,
      favoriteAlbums: 0,
    })

    const music = {
      id: 'tx_001',
      name: 'Test song',
      singer: 'Test singer',
      source: 'tx',
      interval: '03:00',
    } as LX.Music.MusicInfo
    const input = {
      ...empty,
      data: {
        lists: {
          defaultList: [],
          loveList: [music],
          userList: [{ name: 'Backup playlist', id: 'backup', list: [music], locationUpdateTime: null }],
        },
        dislikeRules: 'Blocked song@Blocked singer',
        settings: { theme: 'green' },
        soundEffects: { enabled: true },
        sources: [],
        favoriteArtists: [{ id: 'tx_artist', name: 'Test singer', source: 'tx' }],
        favoriteAlbums: [{ id: 'tx_album', name: 'Test album', source: 'tx' }],
      },
    }
    const restored = await restoreAccountSyncSnapshot('restore', input, {
      expectedEmpty: true,
      expectedRevision: empty.revision,
    })
    assert.equal(restored.empty, false)
    assert.deepEqual(restored.stats, {
      playlists: 1,
      tracks: 2,
      dislikeRules: 1,
      sources: 0,
      favoriteArtists: 1,
      favoriteAlbums: 1,
    })
    assert.equal(restored.data.settings.theme, 'green')
    assert.equal(restored.data.soundEffects.enabled, true)
    assert.equal(restored.data.dislikeRules, 'blocked song@blocked singer')
    assert.equal(restored.data.lists.userList[0].name, 'Backup playlist')
    assert.equal(restored.data.favoriteArtists[0].name, 'Test singer')
    assert.equal(restored.data.favoriteAlbums[0].name, 'Test album')

    await assert.rejects(
      restoreAccountSyncSnapshot('restore', input, { expectedEmpty: true }),
      /already contains sync data/,
    )
    await assert.rejects(
      restoreAccountSyncSnapshot('restore', input, { expectedRevision: empty.revision }),
      /server sync data changed/,
    )
    await assert.rejects(
      restoreAccountSyncSnapshot('restore', { ...input, username: 'another-user' }),
      /different account/,
    )

    const invalidEmpty = await buildAccountSyncSnapshot('invalid')
    const invalidSource = {
      ...invalidEmpty,
      data: {
        ...invalidEmpty.data,
        lists: input.data.lists,
        sources: [{
          id: 'broken.js',
          name: 'Broken',
          version: '1.0.0',
          author: 'test',
          description: '',
          homepage: '',
          supportedSources: [],
          enabledSources: [],
          content: 'module.exports = {}',
        }],
      },
    }
    await assert.rejects(
      restoreAccountSyncSnapshot('invalid', invalidSource, { expectedEmpty: true }),
      /no supported platforms/,
    )
    assert.equal((await buildAccountSyncSnapshot('invalid')).empty, true)

    const oversizeEmpty = await buildAccountSyncSnapshot('oversize')
    const oversize = {
      ...oversizeEmpty,
      data: {
        ...oversizeEmpty.data,
        settings: { value: 'x'.repeat(ACCOUNT_SYNC_MAX_BYTES) },
      },
    }
    await assert.rejects(
      restoreAccountSyncSnapshot('oversize', oversize, { expectedEmpty: true }),
      /snapshot is too large/,
    )
    assert.equal((await buildAccountSyncSnapshot('oversize')).empty, true)
  } finally {
    for (const username of ['restore', 'invalid', 'oversize']) releaseUserSpace(username, true)
    await new Promise(resolve => setTimeout(resolve, 250))
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
