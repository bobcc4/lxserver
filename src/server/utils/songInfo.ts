const firstValue = (...values: any[]) => values.find(value => value !== undefined && value !== null && value !== '')

export const getAlbumArtist = (songInfo: any, fallback?: unknown) => {
  const value = firstValue(
    songInfo?.albumArtist,
    songInfo?.albumArtistName,
    songInfo?.raw?.albumArtist,
    songInfo?.raw?.albumArtistName,
    songInfo?.meta?.albumArtist,
    songInfo?.meta?.albumArtistName,
    fallback,
  )
  return String(value || '').trim()
}

/**
 * Normalizes SDK songs, saved playlist entries, and /api/v1 track wrappers to
 * the canonical root fields consumed by source resolution.
 */
export const normalizeSongInfo = (songInfo: any) => {
  if (!songInfo || typeof songInfo !== 'object') return songInfo

  const raw = songInfo.raw && typeof songInfo.raw === 'object' ? songInfo.raw : {}
  const meta = songInfo.meta && typeof songInfo.meta === 'object'
    ? songInfo.meta
    : raw.meta && typeof raw.meta === 'object' ? raw.meta : {}

  songInfo.source = firstValue(songInfo.source, raw.source, meta.source)

  const stripSourcePrefix = (value: unknown) => {
    if (typeof value !== 'string' || !songInfo.source) return value
    const prefix = `${songInfo.source}_`
    return value.startsWith(prefix) ? value.slice(prefix.length) : value
  }

  songInfo.types ||= firstValue(raw.types, meta.qualitys, meta.types)
  songInfo._types ||= firstValue(raw._types, meta._qualitys, meta._types)

  songInfo.name ||= firstValue(raw.name, songInfo.title, raw.title, meta.name)
  songInfo.singer ||= firstValue(raw.singer, songInfo.artist, raw.artist, meta.singer)
  songInfo.albumArtist ||= getAlbumArtist(songInfo, songInfo.singer)
  songInfo.albumName ||= firstValue(raw.albumName, songInfo.album, raw.album, meta.albumName)
  songInfo.albumId ||= firstValue(raw.albumId, meta.albumId)
  songInfo.img ||= firstValue(raw.img, raw.pic, raw.picUrl, songInfo.artworkUrl, meta.picUrl)
  songInfo.interval ||= firstValue(raw.interval, songInfo.duration, raw.duration, meta.interval)

  if (!songInfo.songmid) {
    songInfo.songmid = stripSourcePrefix(firstValue(raw.songmid, raw.songId, meta.songId, songInfo.id))
  } else {
    songInfo.songmid = stripSourcePrefix(songInfo.songmid)
  }

  switch (songInfo.source) {
    case 'wy':
      if (!songInfo.id) {
        const id = firstValue(raw.id, raw.songId, meta.songId)
        if (id !== undefined) songInfo.id = Number(stripSourcePrefix(id))
      }
      if (!songInfo.songmid && songInfo.id) songInfo.songmid = String(stripSourcePrefix(songInfo.id))
      break

    case 'kg':
      songInfo.hash ||= firstValue(raw.hash, meta.hash)
      break

    case 'tx': {
      songInfo.strMediaMid ||= firstValue(raw.strMediaMid, meta.strMediaMid)
      songInfo.albumMid ||= firstValue(raw.albumMid, meta.albumMid)
      const sourceSongId = firstValue(raw.songId, meta.songId)
      const numericSongId = String(sourceSongId || '')
      if (/^\d+$/.test(numericSongId)) songInfo.songId = numericSongId
      break
    }

    case 'mg':
      songInfo.copyrightId ||= firstValue(raw.copyrightId, meta.copyrightId)
      songInfo.lrcUrl ||= firstValue(raw.lrcUrl, meta.lrcUrl)
      if (!songInfo.songId) songInfo.songId = songInfo.songmid
      break
  }

  return songInfo
}
