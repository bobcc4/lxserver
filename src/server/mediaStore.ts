import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export type MediaFolder = 'cache' | 'music'

interface BlobRow {
  hash: string
  extension: string
  size: number
  object_path: string
}

const mediaRoot = () => path.join(global.lx.dataPath, 'media')
const objectRoot = () => path.join(mediaRoot(), 'objects')
const databasePath = () => path.join(mediaRoot(), 'media.db')
const MEDIA_SCHEMA_VERSION = 1

let database: any

const getDatabase = () => {
  if (database) return database
  const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (filename: string) => any }
  fs.mkdirSync(mediaRoot(), { recursive: true })
  database = new DatabaseSync(databasePath())
  const currentVersion = Number(database.prepare('PRAGMA user_version').get()?.user_version || 0)
  if (currentVersion > MEDIA_SCHEMA_VERSION) {
    database.close()
    database = undefined
    throw new Error(`Unsupported media database version: ${currentVersion}`)
  }
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS media_items (
      username TEXT NOT NULL,
      folder TEXT NOT NULL CHECK (folder IN ('cache', 'music')),
      item_key TEXT NOT NULL,
      item_json TEXT NOT NULL,
      blob_hash TEXT,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (username, folder, item_key)
    );
    CREATE INDEX IF NOT EXISTS idx_media_items_user_folder
      ON media_items (username, folder);
    CREATE INDEX IF NOT EXISTS idx_media_items_user_filename
      ON media_items (username, item_json);
    CREATE INDEX IF NOT EXISTS idx_media_items_blob_hash
      ON media_items (blob_hash);

    CREATE TABLE IF NOT EXISTS media_blobs (
      hash TEXT PRIMARY KEY,
      extension TEXT NOT NULL,
      size INTEGER NOT NULL,
      object_path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_accessed_at INTEGER NOT NULL
    );

    PRAGMA user_version = ${MEDIA_SCHEMA_VERSION};
  `)
  return database
}

export const getMediaRoot = () => {
  fs.mkdirSync(mediaRoot(), { recursive: true })
  return mediaRoot()
}

export const getObjectRoot = () => {
  fs.mkdirSync(objectRoot(), { recursive: true })
  return objectRoot()
}

const normalizeHash = (hash: string) => {
  if (!/^[a-f0-9]{64}$/i.test(hash)) throw new Error('Invalid media object hash')
  return hash.toLowerCase()
}

const objectPathFor = (hash: string, extension: string) => {
  const normalizedHash = normalizeHash(hash)
  const safeExtension = String(extension || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin'
  const dir = path.join(objectRoot(), normalizedHash.slice(0, 2), normalizedHash.slice(2, 4))
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, `${normalizedHash}.${safeExtension}`)
}

const hashFile = async (filePath: string) => new Promise<{ hash: string; size: number }>((resolve, reject) => {
  const hash = crypto.createHash('sha256')
  let size = 0
  const stream = fs.createReadStream(filePath)
  stream.on('data', chunk => {
    size += chunk.length
    hash.update(chunk)
  })
  stream.on('error', reject)
  stream.on('end', () => resolve({ hash: hash.digest('hex'), size }))
})

const verifyObject = async (filePath: string, expectedHash: string, expectedSize: number) => {
  const actual = await hashFile(filePath)
  if (actual.hash !== expectedHash || actual.size !== expectedSize) {
    throw new Error(`Media object verification failed: ${path.basename(filePath)}`)
  }
}

export const registerObject = async (sourcePath: string, extension: string, options: { preserveSource?: boolean } = {}) => {
  if (!fs.existsSync(sourcePath)) throw new Error(`Media source does not exist: ${sourcePath}`)
  const { hash, size } = await hashFile(sourcePath)
  const db = getDatabase()
  const existing = db.prepare('SELECT hash, extension, size, object_path FROM media_blobs WHERE hash = ?').get(hash) as BlobRow | undefined
  const finalPath = existing?.object_path || objectPathFor(hash, extension)

  if (!fs.existsSync(finalPath)) {
    fs.mkdirSync(path.dirname(finalPath), { recursive: true })
    if (options.preserveSource) {
      try {
        fs.linkSync(sourcePath, finalPath)
      } catch (error: any) {
        if (error?.code === 'EEXIST' && fs.existsSync(finalPath)) {
          // Another migration registered the same content concurrently.
        } else {
          if (!['EXDEV', 'EPERM', 'EACCES', 'ENOTSUP'].includes(error?.code)) throw error
          fs.copyFileSync(sourcePath, finalPath, fs.constants.COPYFILE_FICLONE)
        }
      }
    } else {
      try {
        fs.renameSync(sourcePath, finalPath)
      } catch (error: any) {
        if (error?.code === 'EEXIST' || error?.code === 'EPERM') {
          if (fs.existsSync(finalPath)) fs.unlinkSync(sourcePath)
          else throw error
        } else {
          if (error?.code !== 'EXDEV') throw error
          if (!fs.existsSync(finalPath)) fs.copyFileSync(sourcePath, finalPath)
          fs.unlinkSync(sourcePath)
        }
      }
    }
    await verifyObject(finalPath, hash, size)
  } else {
    await verifyObject(finalPath, hash, size)
    if (!options.preserveSource && sourcePath !== finalPath && fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath)
  }

  const now = Date.now()
  db.prepare(`
    INSERT INTO media_blobs (hash, extension, size, object_path, created_at, last_accessed_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(hash) DO UPDATE SET
      size = excluded.size,
      object_path = excluded.object_path,
      last_accessed_at = excluded.last_accessed_at
  `).run(hash, extension.replace('.', '').toLowerCase() || 'bin', size, finalPath, now, now)
  return { hash, size, path: finalPath, extension: existing?.extension || extension.replace('.', '') }
}

export const getObjectPath = (hash: string | undefined) => {
  if (!hash) return null
  const normalizedHash = normalizeHash(hash)
  const row = getDatabase().prepare('SELECT object_path FROM media_blobs WHERE hash = ?').get(normalizedHash) as { object_path: string } | undefined
  if (!row || !fs.existsSync(row.object_path)) return null
  getDatabase().prepare('UPDATE media_blobs SET last_accessed_at = ? WHERE hash = ?').run(Date.now(), normalizedHash)
  return row.object_path
}

export const getObjectInfo = (hash: string | undefined) => {
  if (!hash) return null
  const normalizedHash = normalizeHash(hash)
  const row = getDatabase().prepare('SELECT hash, extension, size, object_path FROM media_blobs WHERE hash = ?').get(normalizedHash) as BlobRow | undefined
  if (!row || !fs.existsSync(row.object_path)) return null
  getDatabase().prepare('UPDATE media_blobs SET last_accessed_at = ? WHERE hash = ?').run(Date.now(), normalizedHash)
  return row
}

export const getObjectHashForPath = (filePath: string) => {
  const row = getDatabase().prepare('SELECT hash FROM media_blobs WHERE object_path = ?').get(filePath) as { hash: string } | undefined
  return row?.hash
}

export const hasExternalLyricReference = (hash: string) => {
  const normalizedHash = normalizeHash(hash)
  const rows = getDatabase().prepare('SELECT item_json FROM media_items WHERE blob_hash = ?').all(normalizedHash) as Array<{ item_json: string }>
  return rows.some(row => {
    try {
      const item = JSON.parse(row.item_json)
      return item?.hasLyric === true && typeof item?.lyricFilename === 'string' && item.lyricFilename.length > 0
    } catch {
      return false
    }
  })
}

export const removeObjectIfUnreferenced = (hash: string | undefined) => {
  if (!hash) return false
  const normalizedHash = normalizeHash(hash)
  const db = getDatabase()
  const refs = db.prepare('SELECT COUNT(*) AS count FROM media_items WHERE blob_hash = ?').get(normalizedHash) as { count: number }
  if (Number(refs?.count || 0) > 0) return false
  const row = db.prepare('SELECT object_path FROM media_blobs WHERE hash = ?').get(normalizedHash) as { object_path: string } | undefined
  if (row?.object_path && fs.existsSync(row.object_path)) fs.unlinkSync(row.object_path)
  const lyricPath = path.join(mediaRoot(), 'lyrics', `${normalizedHash}.lrc`)
  if (fs.existsSync(lyricPath)) fs.unlinkSync(lyricPath)
  db.prepare('DELETE FROM media_blobs WHERE hash = ?').run(normalizedHash)
  return true
}

export const removeUnreferencedObjects = () => {
  const rows = getDatabase().prepare(`
    SELECT b.hash FROM media_blobs b
    LEFT JOIN media_items i ON i.blob_hash = b.hash
    WHERE i.blob_hash IS NULL
  `).all() as Array<{ hash: string }>
  let removed = 0
  for (const row of rows) if (removeObjectIfUnreferenced(row.hash)) removed++

  const knownPaths = new Set((getDatabase().prepare('SELECT object_path FROM media_blobs').all() as Array<{ object_path: string }>)
    .map(row => path.resolve(row.object_path)))
  const removeUnknownFiles = (dir: string) => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        removeUnknownFiles(fullPath)
        if (fs.readdirSync(fullPath).length === 0) fs.rmdirSync(fullPath)
      } else if (!knownPaths.has(path.resolve(fullPath))) {
        fs.unlinkSync(fullPath)
        removed++
      }
    }
  }
  removeUnknownFiles(objectRoot())

  const tempRoot = path.join(mediaRoot(), 'temp')
  if (fs.existsSync(tempRoot)) {
    for (const entry of fs.readdirSync(tempRoot, { withFileTypes: true })) {
      const target = path.join(tempRoot, entry.name)
      if (entry.isDirectory()) fs.rmSync(target, { recursive: true, force: true })
      else fs.unlinkSync(target)
    }
  }
  return removed
}

export class SQLiteIndexManager {
  private readonly indexes = new Map<string, Map<string, any>>()

  private key(username: string, folder: MediaFolder) {
    return `${username}:${folder}`
  }

  load(username: string, folder: MediaFolder, _location?: string) {
    const key = this.key(username, folder)
    const cached = this.indexes.get(key)
    if (cached) return cached
    const index = new Map<string, any>()
    const rows = getDatabase().prepare(`
      SELECT item_key, item_json FROM media_items WHERE username = ? AND folder = ?
    `).all(username, folder) as Array<{ item_key: string; item_json: string }>
    for (const row of rows) {
      try {
        const item = JSON.parse(row.item_json)
        if (item && typeof item === 'object') index.set(row.item_key, item)
      } catch { }
    }
    this.indexes.set(key, index)
    return index
  }

  save(username: string, folder: MediaFolder, _location?: string) {
    const index = this.load(username, folder)
    const db = getDatabase()
    db.exec('BEGIN IMMEDIATE')
    try {
      db.prepare('DELETE FROM media_items WHERE username = ? AND folder = ?').run(username, folder)
      const insert = db.prepare(`
        INSERT INTO media_items (username, folder, item_key, item_json, blob_hash, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      const now = Date.now()
      for (const [itemKey, item] of index) {
        insert.run(username, folder, itemKey, JSON.stringify(item), item.blobHash || null, now)
      }
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  private persistItem(username: string, folder: MediaFolder, itemKey: string, item: any) {
    getDatabase().prepare(`
      INSERT INTO media_items (username, folder, item_key, item_json, blob_hash, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(username, folder, item_key) DO UPDATE SET
        item_json = excluded.item_json,
        blob_hash = excluded.blob_hash,
        updated_at = excluded.updated_at
    `).run(username, folder, itemKey, JSON.stringify(item), item.blobHash || null, Date.now())
  }

  update(username: string, item: any, folder: MediaFolder, _location?: string) {
    const index = this.load(username, folder)
    const itemKey = `${item.id}_${item.quality || 'unknown'}`
    index.set(itemKey, item)
    this.persistItem(username, folder, itemKey, item)
  }

  remove(username: string, songId: string, folder: MediaFolder, quality?: string, _location?: string) {
    const index = this.load(username, folder)
    const keys: string[] = []
    if (quality) {
      if (index.has(`${songId}_${quality}`)) keys.push(`${songId}_${quality}`)
    } else {
      for (const key of [...index.keys()]) {
        if (key === songId || key.startsWith(`${songId}_`)) {
          keys.push(key)
        }
      }
    }
    if (keys.length === 0) return false
    const db = getDatabase()
    db.exec('BEGIN IMMEDIATE')
    try {
      const remove = db.prepare('DELETE FROM media_items WHERE username = ? AND folder = ? AND item_key = ?')
      for (const key of keys) {
        index.delete(key)
        remove.run(username, folder, key)
      }
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    return true
  }

  getAll(username: string, folder: MediaFolder, _location?: string) {
    return [...this.load(username, folder).values()]
  }

  discard(username: string, folder: MediaFolder, _location?: string) {
    const db = getDatabase()
    const rows = db.prepare('SELECT DISTINCT blob_hash FROM media_items WHERE username = ? AND folder = ? AND blob_hash IS NOT NULL').all(username, folder) as Array<{ blob_hash: string }>
    db.prepare('DELETE FROM media_items WHERE username = ? AND folder = ?').run(username, folder)
    this.indexes.delete(this.key(username, folder))
    for (const row of rows) removeObjectIfUnreferenced(row.blob_hash)
  }

  removeUser(username: string) {
    const db = getDatabase()
    const rows = db.prepare('SELECT DISTINCT blob_hash FROM media_items WHERE username = ? AND blob_hash IS NOT NULL').all(username) as Array<{ blob_hash: string }>
    db.prepare('DELETE FROM media_items WHERE username = ?').run(username)
    this.indexes.delete(this.key(username, 'cache'))
    this.indexes.delete(this.key(username, 'music'))
    for (const row of rows) removeObjectIfUnreferenced(row.blob_hash)
  }

  get(username: string, songId: string, folder: MediaFolder, quality?: string, exact = false, _location?: string) {
    const index = this.load(username, folder)
    if (quality) {
      const item = index.get(`${songId}_${quality}`)
      if (item) return item
      if (exact) return undefined
    }
    const prefix = `${songId}_`
    for (const [key, item] of index) {
      if (key === songId || key.startsWith(prefix)) return item
    }
    return undefined
  }
}

export const mediaIndex = new SQLiteIndexManager()
