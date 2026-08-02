export const normalizeLyricsResponse = (content: any, source = 'local') => {
  if (typeof content === 'string') return { content, source }
  if (!content || typeof content !== 'object') return { content: '', source }
  const lyric = [content.lyric, content.lrc, content.lxlyric, content.klyric]
    .find(value => typeof value === 'string' && value.trim()) || ''
  return { ...content, content: lyric, source }
}
