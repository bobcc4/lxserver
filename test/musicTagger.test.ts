import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { MetaPicture, MusicTagger } from '../src/server/musicTagger'

test('music tag adapter reads and writes metadata, lyrics, and cover art', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yinyun-music-tag-'))
  const source = path.resolve('public/music/assets/medias/filters/bright-hall.wav')
  const target = path.join(root, 'metadata-test.wav')
  const cover = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nksAAAAASUVORK5CYII=',
    'base64',
  )

  try {
    fs.copyFileSync(source, target)

    let tagger = new MusicTagger()
    tagger.loadPath(target)
    assert.ok(tagger.duration > 0)
    assert.ok((tagger.sampleRate ?? 0) > 0)

    tagger.title = 'Yinyun metadata test'
    tagger.artist = 'Yinyun'
    tagger.album = 'Yinyun Test Album'
    tagger.lyrics = '[00:01.00]metadata test'
    tagger.pictures = [new MetaPicture('image/png', new Uint8Array(cover), 'Cover')]
    tagger.save()
    tagger.dispose()

    tagger = new MusicTagger()
    tagger.loadPath(target)
    assert.equal(tagger.title, 'Yinyun metadata test')
    assert.equal(tagger.artist, 'Yinyun')
    assert.equal(tagger.album, 'Yinyun Test Album')
    assert.equal(tagger.lyrics, '[00:01.00]metadata test')
    assert.equal(tagger.pictures?.length, 1)
    tagger.dispose()
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
