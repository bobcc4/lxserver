import fs from 'fs'
import path from 'path'
import { normalizeUsername, tryNormalizeUsername } from '@/utils/username'

export interface SourcePlatformPreference {
  owner: string
  sourceId: string
  enabledSources: string[]
  updatedAt: string
}

const PREFERENCES_FILENAME = 'platform-preferences.json'

const normalizePlatforms = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)))
}

const getPreferencesPath = (username: string) => path.join(
  global.lx.userPath,
  'source',
  normalizeUsername(username),
  PREFERENCES_FILENAME,
)

const normalizePreference = (value: unknown): SourcePlatformPreference | null => {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<SourcePlatformPreference>
  const owner = tryNormalizeUsername(record.owner)
  const sourceId = typeof record.sourceId === 'string' ? record.sourceId.trim() : ''
  if (!owner || !sourceId || !Array.isArray(record.enabledSources)) return null

  return {
    owner,
    sourceId,
    enabledSources: normalizePlatforms(record.enabledSources),
    updatedAt: typeof record.updatedAt === 'string' && record.updatedAt
      ? record.updatedAt
      : new Date(0).toISOString(),
  }
}

export const readSourcePlatformPreferences = (username: string): SourcePlatformPreference[] => {
  const preferencesPath = getPreferencesPath(username)
  if (!fs.existsSync(preferencesPath)) return []

  try {
    const value = JSON.parse(fs.readFileSync(preferencesPath, 'utf-8'))
    if (!Array.isArray(value)) return []

    const records = new Map<string, SourcePlatformPreference>()
    for (const item of value) {
      const record = normalizePreference(item)
      if (record) records.set(`${record.owner}:${record.sourceId}`, record)
    }
    return Array.from(records.values())
  } catch {
    return []
  }
}

const writeSourcePlatformPreferences = (username: string, preferences: SourcePlatformPreference[]) => {
  const preferencesPath = getPreferencesPath(username)
  fs.mkdirSync(path.dirname(preferencesPath), { recursive: true })
  fs.writeFileSync(preferencesPath, JSON.stringify(preferences, null, 2), 'utf-8')
}

export const getEnabledSourcePlatforms = (
  username: string,
  owner: string,
  sourceId: string,
  supportedSources: string[],
): string[] => {
  const supported = normalizePlatforms(supportedSources)
  const normalizedOwner = normalizeUsername(owner)
  const preference = readSourcePlatformPreferences(username)
    .find(item => item.owner === normalizedOwner && item.sourceId === sourceId)

  if (!preference) return supported
  const enabled = new Set(preference.enabledSources)
  return supported.filter(source => enabled.has(source))
}

export const isSourcePlatformEnabled = (
  username: string,
  owner: string,
  sourceId: string,
  source: string,
  supportedSources: string[],
) => getEnabledSourcePlatforms(username, owner, sourceId, supportedSources).includes(source)

export const setEnabledSourcePlatforms = (
  username: string,
  owner: string,
  sourceId: string,
  enabledSources: unknown,
  supportedSources: string[],
): string[] => {
  if (!Array.isArray(enabledSources)) throw new Error('enabledSources must be an array')

  const normalizedUsername = normalizeUsername(username)
  const normalizedOwner = normalizeUsername(owner)
  const normalizedSourceId = typeof sourceId === 'string' ? sourceId.trim() : ''
  if (!normalizedSourceId) throw new Error('sourceId is required')

  const supported = normalizePlatforms(supportedSources)
  const selected = normalizePlatforms(enabledSources)
  const supportedSet = new Set(supported)
  const unsupported = selected.find(source => !supportedSet.has(source))
  if (unsupported) throw new Error(`Unsupported platform: ${unsupported}`)

  const selectedSet = new Set(selected)
  const enabled = supported.filter(source => selectedSet.has(source))
  const preferences = readSourcePlatformPreferences(normalizedUsername)
    .filter(item => !(item.owner === normalizedOwner && item.sourceId === normalizedSourceId))
  preferences.push({
    owner: normalizedOwner,
    sourceId: normalizedSourceId,
    enabledSources: enabled,
    updatedAt: new Date().toISOString(),
  })
  writeSourcePlatformPreferences(normalizedUsername, preferences)
  return enabled
}

export const removeSourcePlatformPreferences = (owner: string, sourceId: string) => {
  const normalizedOwner = normalizeUsername(owner)
  for (const user of global.lx.config.users) {
    const username = normalizeUsername(user.name)
    const preferences = readSourcePlatformPreferences(username)
    const filtered = preferences.filter(item => !(item.owner === normalizedOwner && item.sourceId === sourceId))
    if (filtered.length !== preferences.length) writeSourcePlatformPreferences(username, filtered)
  }
}
