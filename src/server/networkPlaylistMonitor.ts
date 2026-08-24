import fs from 'node:fs'
import path from 'node:path'
import { File } from '@/constants'
import { getUserDirname, getUserSpace } from '@/user'
import { normalizeUsername } from '@/utils/username'
import { networkPlaylistsAreEqual, parseNetworkPlaylistInterval, networkPlaylistSongKey } from './networkPlaylistMonitorUtils'

type NetworkPlaylistStatus = {
  listId: string
  name: string
  source: string
  sourceListId: string
  changed: boolean
  checkedAt: number
  localCount: number
  remoteCount?: number
  error?: string
  lastSuccessAt?: number
}

type MonitorDeps = {
  getUsers: () => Array<{ name: string }>
  musicSdk: any
  normalizeSongInfo: (value: any) => any
}

const MIN_INTERVAL_MS = 30 * 1000
const DEFAULT_INTERVAL = 6 * 60 * 60 * 1000


const getStatePath = (username: string) => path.join(
  global.lx.userPath,
  getUserDirname(username),
  File.userNetworkPlaylistCheckJSON,
)

const readState = (username: string): Record<string, NetworkPlaylistStatus> => {
  try {
    const value = JSON.parse(fs.readFileSync(getStatePath(username), 'utf8'))
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

const writeState = (username: string, state: Record<string, NetworkPlaylistStatus>) => {
  const filePath = getStatePath(username)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8')
}

const getUserSettings = (username: string): Record<string, any> => {
  try {
    const settingsPath = path.join(getUserSpace(username).dataManage.userDir, File.userSettingsJSON)
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    return settings && typeof settings === 'object' ? settings : {}
  } catch {
    return {}
  }
}

const getTargetLists = async (username: string) => {
  const data = await getUserSpace(username).listManage.getListData()
  return data.userList.filter(list => !!list?.source && !!list?.sourceListId)
}

export class NetworkPlaylistMonitor {
  private readonly timers = new Map<string, NodeJS.Timeout>()
  private readonly running = new Set<string>()

  constructor(private readonly deps: MonitorDeps) {}

  private stopTimer(username: string) {
    const timer = this.timers.get(username)
    if (timer) clearInterval(timer)
    this.timers.delete(username)
  }

  stop() {
    for (const username of this.timers.keys()) this.stopTimer(username)
  }

  reloadUser(username: string) {
    const normalized = normalizeUsername(username)
    this.stopTimer(normalized)
    const settings = getUserSettings(normalized)
    if (settings.autoUpdateNetworkList !== true) return
    const interval = parseNetworkPlaylistInterval(settings.networkListAutoCheckInterval)
    if (!interval) return
    const timer = setInterval(() => { void this.checkUser(normalized) }, interval)
    timer.unref?.()
    this.timers.set(normalized, timer)
    setTimeout(() => { void this.checkUser(normalized) }, 1000).unref?.()
  }

  start() {
    this.stop()
    for (const user of this.deps.getUsers()) this.reloadUser(user.name)
  }

  async checkUser(username: string) {
    const normalized = normalizeUsername(username)
    if (this.running.has(normalized)) return this.getStatus(normalized)
    this.running.add(normalized)
    const state = readState(normalized)
    try {
      const lists = await getTargetLists(normalized)
      for (const list of lists) {
        const previous = state[list.id]
        const entry: NetworkPlaylistStatus = {
          listId: list.id,
          name: list.name,
          source: list.source!,
          sourceListId: list.sourceListId!,
          changed: previous?.changed === true,
          checkedAt: Date.now(),
          localCount: Array.isArray(list.list) ? list.list.length : 0,
          ...(previous?.lastSuccessAt ? { lastSuccessAt: previous.lastSuccessAt } : {}),
        }
        try {
          const sdk = this.deps.musicSdk[list.source!]
          if (!sdk?.songList?.getListDetail) throw new Error(`Source ${list.source} does not support song list details`)
          const result = await sdk.songList.getListDetail(list.sourceListId, 1)
          const remote = Array.isArray(result?.list) ? result.list.map(this.deps.normalizeSongInfo) : []
          entry.remoteCount = remote.length
          entry.changed = !networkPlaylistsAreEqual(Array.isArray(list.list) ? list.list : [], remote)
          entry.lastSuccessAt = entry.checkedAt
          delete entry.error
        } catch (error: any) {
          entry.error = error?.message || String(error)
          // Keep the previous changed state on a transient upstream failure.
          if (previous?.changed === true) entry.changed = true
          console.warn(`[NetworkPlaylistMonitor] ${normalized}/${list.id}: ${entry.error}`)
        }
        state[list.id] = entry
      }
      writeState(normalized, state)
      return Object.values(state)
    } finally {
      this.running.delete(normalized)
    }
  }

  getStatus(username: string) {
    return Object.values(readState(normalizeUsername(username)))
  }

  async checkAndGetStatus(username: string) {
    await this.checkUser(username)
    return this.getStatus(username)
  }
}
