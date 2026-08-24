import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  createExternalMusicLibrary,
  getExternalLibraryByLocation,
  getExternalLibraryContainerPath,
  getExternalLocation,
  removeExternalMusicLibrary,
} from '../src/server/externalMusicLibraries'

test('external music libraries are user-scoped and use stable container paths', () => {
  const previous = (global as any).lx
  const dataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'yinyun-external-library-'))
  ;(global as any).lx = { dataPath, config: { users: [{ name: 'admin' }] } }

  try {
    const library = createExternalMusicLibrary('admin', 'bendigequ')
    const location = getExternalLocation(library)
    assert.equal(getExternalLibraryContainerPath(library), '/server/external/admin/bendigequ')
    assert.equal(getExternalLibraryByLocation(location, 'admin')?.id, library.id)
    assert.equal(getExternalLibraryByLocation(location, 'other'), null)
    assert.equal(removeExternalMusicLibrary(library.id)?.id, library.id)
    assert.equal(getExternalLibraryByLocation(location, 'admin'), null)
  } finally {
    ;(global as any).lx = previous
    fs.rmSync(dataPath, { recursive: true, force: true })
  }
})
