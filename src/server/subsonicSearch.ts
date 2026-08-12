import { hasUsableQualityEntry } from './audioQuality'

export const SUBSONIC_SOURCE_PRIORITY = ['tx', 'wy', 'kw', 'kg', 'mg'] as const
export const SUBSONIC_SOURCE_PRIORITY_VALUE = SUBSONIC_SOURCE_PRIORITY.join(',')
export const LEGACY_SUBSONIC_SOURCE_PRIORITY_VALUE = 'wy,tx,kw,kg,mg'

type SearchMusic = {
  id?: string
  name?: string
  singer?: string
  source?: string
  quality?: string
  type?: string
  types?: unknown
  _types?: unknown
  _qualitys?: unknown
  meta?: Record<string, any>
}

export type SubsonicSearchResult<T extends SearchMusic = SearchMusic> = {
  music: T
  listId: string
}

const QUALITY_PRIORITY = ['master', 'atmos_plus', 'atmos', 'hires', 'flac24bit', 'flac', '320k', '192k', '128k'] as const

const parseByteSize = (value: unknown) => {
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  if (typeof value !== 'string') return undefined

  const match = value.trim().replace(/,/g, '').match(/^(\d+(?:\.\d+)?)\s*(B|K|KB|KIB|M|MB|MIB|G|GB|GIB)?$/i)
  if (!match) return undefined
  const multipliers: Record<string, number> = {
    B: 1,
    K: 1024,
    KB: 1024,
    KIB: 1024,
    M: 1024 ** 2,
    MB: 1024 ** 2,
    MIB: 1024 ** 2,
    G: 1024 ** 3,
    GB: 1024 ** 3,
    GIB: 1024 ** 3,
  }
  return Number(match[1]) * multipliers[(match[2] || 'B').toUpperCase()]
}

const normalizeSearchText = (value: unknown) => String(value || '')
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[\s\p{P}\p{S}]/gu, '')

const splitSingerNames = (value: unknown) => String(value || '')
  .split(/[、，,&；;|/+]/)
  .map(normalizeSearchText)
  .filter(Boolean)

const getMatchRank = (music: SearchMusic, query: string) => {
  const normalizedQuery = normalizeSearchText(query)
  const name = normalizeSearchText(music.name)
  if (!normalizedQuery || !name) return 0

  const singerNames = splitSingerNames(music.singer)
  const includesName = normalizedQuery.includes(name)
  const includesSinger = singerNames.some(singer => normalizedQuery.includes(singer))
  if (includesName && includesSinger) return 2
  if (normalizedQuery === name) return 1
  return 0
}

const getQualityRank = (music: SearchMusic) => {
  const meta = music.meta || {}
  const explicitQuality = String(music.quality || music.type || '').toLowerCase()
  const qualitySources = [
    music.types,
    music._types,
    music._qualitys,
    meta.qualitys,
    meta.types,
    meta._types,
    meta._qualitys,
  ]

  for (let index = 0; index < QUALITY_PRIORITY.length; index++) {
    const quality = QUALITY_PRIORITY[index]
    if (explicitQuality === quality) return QUALITY_PRIORITY.length - index

    for (const source of qualitySources) {
      let entry: any
      if (Array.isArray(source)) {
        entry = source.find(value => value === quality || value?.type === quality || value?.name === quality)
      } else if (source && typeof source === 'object') {
        entry = (source as Record<string, unknown>)[quality]
      }
      if (hasUsableQualityEntry(entry, parseByteSize)) return QUALITY_PRIORITY.length - index
    }
  }
  return 0
}

export const normalizeSubsonicSourcePriority = (value: unknown) => {
  const sources = String(value || '')
    .split(',')
    .map(source => source.trim().toLowerCase())
    .filter((source, index, list) => SUBSONIC_SOURCE_PRIORITY.includes(source as any) && list.indexOf(source) === index)
  return sources.length > 0 ? sources : [...SUBSONIC_SOURCE_PRIORITY]
}

export const migrateLegacySubsonicSourcePriority = (value: unknown) => (
  String(value || '').replace(/\s/g, '') === LEGACY_SUBSONIC_SOURCE_PRIORITY_VALUE
    ? SUBSONIC_SOURCE_PRIORITY_VALUE
    : value
)

export const sortSubsonicSongResults = <T extends SearchMusic>(
  results: Array<SubsonicSearchResult<T>>,
  query: string,
  sourcePriority: readonly string[],
) => {
  const sourceRanks = new Map(sourcePriority.map((source, index) => [source, index]))
  return results
    .map((result, index) => ({
      result,
      index,
      matchRank: getMatchRank(result.music, query),
      isLocal: result.listId === 'local_music' || Boolean((result.music as any)._localFilename),
      sourceRank: sourceRanks.get(String(result.music.source || '')) ?? sourcePriority.length,
      qualityRank: getQualityRank(result.music),
    }))
    .sort((a, b) => (
      b.matchRank - a.matchRank ||
      Number(b.isLocal) - Number(a.isLocal) ||
      a.sourceRank - b.sourceRank ||
      b.qualityRank - a.qualityRank ||
      a.index - b.index
    ))
    .map(item => item.result)
}
