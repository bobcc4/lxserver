import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { ACCOUNT_SYNC_MAX_BYTES } from '../src/server/accountSyncContract'

test('account sync API supports login, large restore, and conflict protection', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yinyun-account-api-'))
  const dataPath = path.join(root, 'data')
  fs.mkdirSync(path.join(dataPath, 'users'), { recursive: true })
  global.lx = {
    dataPath,
    userPath: path.join(dataPath, 'users'),
    logPath: path.join(root, 'logs'),
    staticPath: path.join(root, 'public'),
    config: {
      users: [{ name: 'admin', password: 'password' }],
      maxSnapshotNum: 10,
      'list.addMusicLocationType': 'bottom',
      'player.path': '/music',
      'subsonic.enable': true,
    } as LX.Config,
    saveConfig: () => {},
  }

  const { createApiV1Handler } = await import('../src/server/apiV1')
  const { releaseUserSpace } = await import('../src/user')
  const handler = createApiV1Handler({
    serverVersion: 'test',
    getAuthSecret: () => 'test-secret',
    getUsers: () => global.lx.config.users,
    musicSdk: {},
    normalizeSongInfo: value => value,
    resolveSong: async () => null,
    isSourceSupported: () => false,
    getLoadedSources: () => [],
  })
  const server = http.createServer((req, res) => {
    void handler(req, res, new URL(req.url || '/', 'http://127.0.0.1')).then(handled => {
      if (!handled) {
        res.writeHead(404)
        res.end()
      }
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const origin = `http://127.0.0.1:${address.port}`

  try {
    const loginResponse = await fetch(`${origin}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ADMIN', password: 'password' }),
    })
    assert.equal(loginResponse.status, 200)
    const login = await loginResponse.json() as any
    const headers = {
      'Authorization': `Bearer ${login.data.accessToken}`,
      'Content-Type': 'application/json',
    }

    const snapshotResponse = await fetch(`${origin}/api/v1/sync/snapshot`, { headers })
    assert.equal(snapshotResponse.status, 200)
    const snapshot = (await snapshotResponse.json() as any).data
    assert.equal(snapshot.empty, true)

    snapshot.data.settings = { largeValue: 'x'.repeat(2_250_000) }
    const restoreBody = JSON.stringify({
      confirm: 'restore',
      snapshot,
      expectedEmpty: true,
      expectedRevision: snapshot.revision,
    })
    assert.ok(Buffer.byteLength(restoreBody) > 2 * 1024 * 1024)
    const restoreResponse = await fetch(`${origin}/api/v1/sync/snapshot`, {
      method: 'PUT',
      headers,
      body: restoreBody,
    })
    assert.equal(restoreResponse.status, 200)
    const restored = (await restoreResponse.json() as any).data
    assert.equal(restored.data.settings.largeValue.length, 2_250_000)

    const conflictResponse = await fetch(`${origin}/api/v1/sync/snapshot`, {
      method: 'PUT',
      headers,
      body: restoreBody,
    })
    assert.equal(conflictResponse.status, 409)
    assert.equal((await conflictResponse.json() as any).error.code, 'sync_conflict')

    const oversizedResponse = await fetch(`${origin}/api/v1/sync/snapshot`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ value: 'x'.repeat(ACCOUNT_SYNC_MAX_BYTES + 128 * 1024) }),
    })
    assert.equal(oversizedResponse.status, 413)
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
    releaseUserSpace('admin', true)
    await new Promise(resolve => setTimeout(resolve, 250))
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
