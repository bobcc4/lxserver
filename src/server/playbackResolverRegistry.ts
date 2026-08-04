export interface ServerSongResolveResult {
  url: string
  quality: string
  songInfo: any
  requestedSource?: string
  downloadSource?: string
  sourceName?: string
}

export interface ServerSongResolveOptions {
  allowPlatformSwitch?: boolean
  allowApiSwitch?: boolean
}

export type ServerSongResolver = (
  rawSongInfo: any,
  requestedQuality: string,
  username: string,
  allowQualityFallback: boolean,
  options?: ServerSongResolveOptions,
) => Promise<ServerSongResolveResult>

let resolver: ServerSongResolver | null = null

export const registerPlaybackResolver = (value: ServerSongResolver) => {
  resolver = value
}

export const getPlaybackResolver = () => {
  if (!resolver) throw new Error('Playback resolver is not initialized')
  return resolver
}

export const resolveOriginalPlatformFirst = async <T, R>(
  qualities: readonly string[],
  originalSong: T,
  getAlternateSongs: () => Promise<T[]>,
  attempt: (quality: string, songs: T[]) => Promise<R | null>,
) => {
  for (const quality of qualities) {
    const result = await attempt(quality, [originalSong])
    if (result) return result
  }

  const alternateSongs = await getAlternateSongs()
  for (const quality of qualities) {
    const result = await attempt(quality, alternateSongs)
    if (result) return result
  }
  return null
}
