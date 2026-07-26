import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const main = async () => {
  const dataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-media-store-'))
  ;(global as any).lx = { dataPath }

  const {
    hasExternalLyricReference,
    mediaIndex,
    registerObject,
    removeObjectIfUnreferenced,
  } = await import('../src/server/mediaStore')

  const sourceA = path.join(dataPath, 'source-a.flac')
  const sourceB = path.join(dataPath, 'source-b.flac')
  const content = crypto.randomBytes(4096)
  fs.writeFileSync(sourceA, content)
  fs.writeFileSync(sourceB, content)

  const objectA = await registerObject(sourceA, '.flac')
  const objectB = await registerObject(sourceB, '.flac')
  assert.equal(objectA.hash, objectB.hash, 'identical audio must deduplicate')
  assert.equal(objectA.path, objectB.path, 'deduplicated audio must share one object')

  const item = (id: string) => ({
    id,
    quality: 'flac',
    filename: `${id}.flac`,
    blobHash: objectA.hash,
    hasLyric: true,
    lyricFilename: `${id}.lrc`,
  })
  mediaIndex.update('admin', item('song-a'), 'music')
  mediaIndex.update('xiangyun', item('song-b'), 'music')

  const lyricDir = path.join(dataPath, 'media', 'lyrics')
  fs.mkdirSync(lyricDir, { recursive: true })
  const lyricPath = path.join(lyricDir, `${objectA.hash}.lrc`)
  fs.writeFileSync(lyricPath, '[00:00.00]test')
  assert.equal(hasExternalLyricReference(objectA.hash), true)

  mediaIndex.remove('admin', 'song-a', 'music', 'flac')
  assert.equal(removeObjectIfUnreferenced(objectA.hash), false, 'one user must not delete another user\'s object')
  assert.equal(fs.existsSync(objectA.path), true)

  const mutation = path.join(dataPath, 'mutation.flac')
  fs.writeFileSync(mutation, Buffer.concat([content, Buffer.from('metadata')]))
  const mutatedObject = await registerObject(mutation, '.flac')
  assert.notEqual(mutatedObject.hash, objectA.hash, 'mutated audio must become a new immutable object')
  assert.equal(fs.existsSync(objectA.path), true, 'mutation must preserve the shared source object')

  mediaIndex.remove('xiangyun', 'song-b', 'music', 'flac')
  assert.equal(removeObjectIfUnreferenced(objectA.hash), true)
  assert.equal(fs.existsSync(objectA.path), false)
  assert.equal(fs.existsSync(lyricPath), false)
  assert.equal(removeObjectIfUnreferenced(mutatedObject.hash), true)

  console.log(`media-store integration test passed: ${dataPath}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
