import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { File } from '@/constants'
import { getUserSpace } from '@/user'
import {
  exportOwnedSourcesForSync,
  normalizeAccountSyncSources,
  restoreOwnedSourcesFromSync,
  type AccountSyncSource,
} from './customSourceHandlers'
import { ACCOUNT_SYNC_MAX_BYTES, ACCOUNT_SYNC_SCHEMA_VERSION } from './accountSyncContract'

export { ACCOUNT_SYNC_MAX_BYTES, ACCOUNT_SYNC_SCHEMA_VERSION } from './accountSyncContract'

interface AccountSyncData {
  lists: LX.Sync.List.ListData
  dislikeRules: string
  settings: Record<string, unknown>
  soundEffects: Record<string, unknown>
  sources: AccountSyncSource[]
}

export interface AccountSyncSnapshot {
  schemaVersion: number
  username: string
  exportedAt: string
  revision: string
  empty: boolean
  stats: {
    playlists: number
    tracks: number
    dislikeRules: number
    sources: number
  }
  data: AccountSyncData
}

const readJsonObject = (filePath: string): Record<string, unknown> => {
  if (!fs.existsSync(filePath)) return {}
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

const writeJsonAtomic = (filePath: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8')
  fs.renameSync(tempPath, filePath)
}

const normalizeObject = (value: unknown, field: string) => {
  if (value == null) return {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field} must be an object`)
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

const normalizeLists = (value: unknown): LX.Sync.List.ListData => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('lists must be an object')
  const lists = value as Partial<LX.Sync.List.ListData>
  if (!Array.isArray(lists.defaultList) || !Array.isArray(lists.loveList) || !Array.isArray(lists.userList)) {
    throw new Error('lists snapshot is incomplete')
  }
  for (const playlist of lists.userList) {
    if (!playlist || typeof playlist !== 'object' || typeof playlist.id !== 'string' || !Array.isArray(playlist.list)) {
      throw new Error('lists snapshot contains an invalid playlist')
    }
  }
  return JSON.parse(JSON.stringify(lists)) as LX.Sync.List.ListData
}

const normalizeSources = (value: unknown): AccountSyncSource[] => {
  return normalizeAccountSyncSources(value)
}

const normalizeData = (value: unknown): AccountSyncData => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('snapshot data is required')
  const data = value as Partial<AccountSyncData>
  return {
    lists: normalizeLists(data.lists),
    dislikeRules: typeof data.dislikeRules === 'string' ? data.dislikeRules : '',
    settings: normalizeObject(data.settings, 'settings'),
    soundEffects: normalizeObject(data.soundEffects, 'soundEffects'),
    sources: normalizeSources(data.sources),
  }
}

const countTracks = (lists: LX.Sync.List.ListData) => (
  lists.defaultList.length + lists.loveList.length + lists.userList.reduce((total, list) => total + list.list.length, 0)
)

const getStats = (data: AccountSyncData) => ({
  playlists: data.lists.userList.length,
  tracks: countTracks(data.lists),
  dislikeRules: data.dislikeRules.split(/\r?\n/).filter(Boolean).length,
  sources: data.sources.length,
})

const getRevision = (data: AccountSyncData) => crypto
  .createHash('sha256')
  .update(JSON.stringify(data))
  .digest('hex')

export const buildAccountSyncSnapshot = async (username: string): Promise<AccountSyncSnapshot> => {
  const userSpace = getUserSpace(username)
  const data: AccountSyncData = {
    lists: await userSpace.listManage.getListData(),
    dislikeRules: await userSpace.dislikeManage.getDislikeRules(),
    settings: readJsonObject(path.join(userSpace.dataManage.userDir, File.userSettingsJSON)),
    soundEffects: readJsonObject(path.join(userSpace.dataManage.userDir, File.userSoundEffectsJSON)),
    sources: exportOwnedSourcesForSync(username),
  }
  const stats = getStats(data)
  const hasSettings = Object.keys(data.settings).length > 0 || Object.keys(data.soundEffects).length > 0
  return {
    schemaVersion: ACCOUNT_SYNC_SCHEMA_VERSION,
    username,
    exportedAt: new Date().toISOString(),
    revision: getRevision(data),
    empty: stats.playlists === 0 && stats.tracks === 0 && stats.dislikeRules === 0 && stats.sources === 0 && !hasSettings,
    stats,
    data,
  }
}

export const restoreAccountSyncSnapshot = async (
  username: string,
  input: unknown,
  options: { expectedEmpty?: boolean; expectedRevision?: string } = {},
): Promise<AccountSyncSnapshot> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('snapshot is required')
  const snapshot = input as Partial<AccountSyncSnapshot>
  if (snapshot.schemaVersion !== ACCOUNT_SYNC_SCHEMA_VERSION) throw new Error('unsupported snapshot schema version')
  if (typeof snapshot.username !== 'string' || snapshot.username.trim().toLowerCase() !== username.toLowerCase()) {
    throw new Error('snapshot belongs to a different account')
  }
  const data = normalizeData(snapshot.data)
  if (Buffer.byteLength(JSON.stringify(data), 'utf-8') > ACCOUNT_SYNC_MAX_BYTES) throw new Error('snapshot is too large')

  const current = await buildAccountSyncSnapshot(username)
  if (options.expectedEmpty && !current.empty) throw new Error('server account already contains sync data')
  if (options.expectedRevision && options.expectedRevision !== current.revision) {
    throw new Error('server sync data changed; refresh before restoring')
  }

  const userSpace = getUserSpace(username)
  await userSpace.listManage.getListData()
  await userSpace.listManage.listDataManage.restore(data.lists)
  await userSpace.listManage.createSnapshot()
  await userSpace.dislikeManage.dislikeDataManage.overwirteDislikeInfo(data.dislikeRules)
  await userSpace.dislikeManage.createSnapshot()
  writeJsonAtomic(path.join(userSpace.dataManage.userDir, File.userSettingsJSON), data.settings)
  writeJsonAtomic(path.join(userSpace.dataManage.userDir, File.userSoundEffectsJSON), data.soundEffects)
  await restoreOwnedSourcesFromSync(username, data.sources)

  return buildAccountSyncSnapshot(username)
}
