export interface AudioQualityFormat {
  suffix: string
  contentType: string
  bitRate?: number
}

const QUALITY_FORMATS: Record<string, AudioQualityFormat> = {
  master: { suffix: 'flac', contentType: 'audio/flac' },
  atmos_plus: { suffix: 'm4a', contentType: 'audio/mp4' },
  atmos: { suffix: 'm4a', contentType: 'audio/mp4' },
  hires: { suffix: 'flac', contentType: 'audio/flac' },
  flac24bit: { suffix: 'flac', contentType: 'audio/flac' },
  flac: { suffix: 'flac', contentType: 'audio/flac' },
  '320k': { bitRate: 320, suffix: 'mp3', contentType: 'audio/mpeg' },
  '192k': { bitRate: 192, suffix: 'mp3', contentType: 'audio/mpeg' },
  '128k': { bitRate: 128, suffix: 'mp3', contentType: 'audio/mpeg' },
}

export const getAudioQualityFormat = (quality: string): AudioQualityFormat => (
  QUALITY_FORMATS[quality] || QUALITY_FORMATS['128k']
)

const SIZE_FIELDS = ['size', 'fileSize', 'filesize'] as const

export const hasUsableQualityEntry = (
  entry: unknown,
  parseByteSize: (value: unknown) => number | undefined,
) => {
  if (entry == null || entry === false) return false
  if (typeof entry !== 'object') return true

  const record = entry as Record<string, unknown>
  const presentSizeFields = SIZE_FIELDS.filter(field => Object.prototype.hasOwnProperty.call(record, field))
  if (!presentSizeFields.length) return true
  return presentSizeFields.some(field => Boolean(parseByteSize(record[field])))
}

export const getUpstreamAudioContentType = (value: unknown, fallback: string) => {
  const contentType = String(value || '').split(';')[0].trim().toLowerCase()
  return contentType.startsWith('audio/') ? contentType : fallback
}
