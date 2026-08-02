export interface AlbumReleaseReference {
  source: string
  id?: string
  name: string
  artist?: string
}

export const normalizeAlbumText = (value: unknown) => String(value || '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[\s·・.'’"“”\-—_()[\]（）【】]/g, '')

export const albumReleaseTimestamp = (album: any) => Date.parse(String(album?._releaseDate || '')) || (
  album?.year ? Date.UTC(Number(album.year), 0, 1) : 0
)

export const sortAlbumsByReleaseDate = (albums: any[]) => albums.sort((left, right) => (
  albumReleaseTimestamp(right) - albumReleaseTimestamp(left) ||
  String(left?.name || '').localeCompare(String(right?.name || ''), 'zh-CN')
))

const albumItems = (value: any) => Array.isArray(value)
  ? value
  : Array.isArray(value?.list)
    ? value.list
    : Array.isArray(value?.items)
      ? value.items
      : []

const albumId = (value: any) => value?.id || value?.mid || value?.albumMid || value?.albumId || value?.meta?.albumId
const albumName = (value: any) => value?.name || value?.albumName || value?.info?.name || ''
const albumArtist = (value: any) => value?.artist || value?.artistName || value?.singer || value?.info?.author || ''

export const resolveAlbumReleaseDate = async (musicSdk: any, reference: AlbumReleaseReference) => {
  const requestedSource = String(reference.source || '').toLowerCase()
  if (reference.id && musicSdk[requestedSource]?.extendDetail?.getAlbumSongs) {
    try {
      const album = await musicSdk[requestedSource].extendDetail.getAlbumSongs(reference.id)
      if (album?.publishTime) return String(album.publishTime)
    } catch { /* Legacy IDs are resolved by the catalog search below. */ }
  }

  const expectedName = normalizeAlbumText(reference.name)
  const expectedArtist = normalizeAlbumText(reference.artist)
  for (const source of [...new Set([requestedSource, 'tx', 'wy'])].filter(item => ['tx', 'wy'].includes(item))) {
    const search = musicSdk[source]?.extendSearch?.searchAlbum
    const detail = musicSdk[source]?.extendDetail?.getAlbumSongs
    if (!search || !detail) continue
    try {
      const result = await search(reference.name, 1, 10)
      const exact = albumItems(result).filter((item: any) => normalizeAlbumText(albumName(item)) === expectedName)
      const match = exact.find((item: any) => {
        const candidate = normalizeAlbumText(albumArtist(item))
        return !expectedArtist || candidate.includes(expectedArtist) || expectedArtist.includes(candidate)
      }) || exact[0]
      const id = albumId(match)
      if (!id) continue
      const album = await detail(id)
      if (album?.publishTime) return String(album.publishTime)
    } catch { /* Try the next catalog. */ }
  }
  return ''
}
