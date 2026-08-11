import { httpFetch } from '../../request'
import getMusicInfo from './musicInfo'
import { decodeQrc } from './qrcDecode'

const songIdMap = new Map()
const songInfoPromises = new Map()

const decodeName = (str = '') => {
  if (!str) return ''
  return str.replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(dec))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

const formatTime = (timeMs) => {
  const ms = timeMs % 1000
  const totalSeconds = Math.floor(timeMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}]`
}

const removeQrcWrapper = (text = '') => {
  const content = text.trim()
  if (!content.startsWith('<')) return content
  const cdata = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  if (cdata) return cdata[1]
  const attr = content.match(/LyricContent="([\s\S]*)"\s*\/?>/)
  return attr ? decodeName(attr[1]) : content
}

const parseQrcMain = (text) => {
  const lyricLines = []
  const wordLines = []
  const lineTime = /^\[(\d+),(\d+)\]/
  const wordTime = /\((\d+),(\d+)\)/g

  for (const rawLine of removeQrcWrapper(text).replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim()
    const header = lineTime.exec(line)
    if (!header) {
      if (/^\[(?:ar|ti|al|by|offset):/i.test(line)) lyricLines.push(line)
      continue
    }

    const lineStart = Number(header[1])
    const body = line.slice(header[0].length)
    let cursor = 0
    let plainText = ''
    let wordText = ''
    let match
    wordTime.lastIndex = 0
    while ((match = wordTime.exec(body))) {
      const word = decodeName(body.slice(cursor, match.index))
      if (word) {
        const absoluteStart = Number(match[1])
        const duration = Math.max(1, Number(match[2]))
        plainText += word
        wordText += `<${Math.max(0, absoluteStart - lineStart)},${duration}>${word}`
      }
      cursor = match.index + match[0].length
    }
    const trailing = decodeName(body.slice(cursor))
    plainText += trailing
    wordText += trailing
    const tag = formatTime(lineStart)
    if (plainText.trim()) lyricLines.push(`${tag}${plainText}`)
    if (wordText.includes('<')) wordLines.push(`${tag}${wordText}`)
  }

  return { lyric: lyricLines.join('\n'), lxlyric: wordLines.join('\n') }
}

const parseTimedLines = (text) => {
  const lines = []
  const lineTime = /^\[(\d+),\d+\]/
  const standardTime = /^\[([\d:.]+)\]/
  for (const rawLine of removeQrcWrapper(text).replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim()
    const header = lineTime.exec(line)
    if (header) {
      const body = decodeName(line.slice(header[0].length).replace(/\(\d+,\d+\)/g, ''))
      if (body.trim()) lines.push(`${formatTime(Number(header[1]))}${body}`)
      continue
    }
    const standardHeader = standardTime.exec(line)
    if (standardHeader) {
      const body = decodeName(line.slice(standardHeader[0].length).replace(/\(\d+,\d+\)/g, ''))
      if (body.trim()) lines.push(`${standardHeader[0]}${body}`)
    }
  }
  return lines.join('\n')
}

const parseQrcResult = async (data) => {
  const [main, trans, roma] = await Promise.all([
    decodeQrc(data?.lyric || ''),
    decodeQrc(data?.trans || ''),
    decodeQrc(data?.roma || ''),
  ])
  if (!main) throw new Error('TX QRC decrypt failed')
  const parsed = parseQrcMain(main)
  if (!parsed.lyric) throw new Error('TX QRC parse failed')
  return {
    ...parsed,
    tlyric: parseTimedLines(trans),
    rlyric: parseTimedLines(roma),
    _lyricKind: parsed.lxlyric ? 'word' : 'line',
    _lyricProvider: 'tx-qrc',
  }
}

const getNumericSongId = async (musicInfo) => {
  const explicitId = Number(musicInfo?.songId || musicInfo?.id)
  if (Number.isInteger(explicitId) && explicitId > 0) return explicitId
  const rawSongmid = musicInfo?.songmid || musicInfo
  const songmid = typeof rawSongmid === 'string' && rawSongmid.startsWith('tx_') ? rawSongmid.slice(3) : rawSongmid
  if (!songmid) throw new Error('TX songmid missing')
  if (songIdMap.has(songmid)) return songIdMap.get(songmid)
  let promise = songInfoPromises.get(songmid)
  if (!promise) {
    promise = getMusicInfo(songmid)
    songInfoPromises.set(songmid, promise)
  }
  try {
    const detail = await promise
    const songId = Number(detail?.songId)
    if (!songId) throw new Error('TX numeric song ID not found')
    songIdMap.set(songmid, songId)
    return songId
  } finally {
    songInfoPromises.delete(songmid)
  }
}

const requestQrc = (songId) => httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
  method: 'post',
  headers: {
    Referer: 'https://y.qq.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  body: {
    comm: { ct: '19', cv: '1859', uin: '0' },
    req: {
      method: 'GetPlayLyricInfo',
      module: 'music.musichallSong.PlayLyricInfo',
      param: {
        format: 'json', crypt: 1, ct: 19, cv: 1873, interval: 0,
        lrc_t: 0, qrc: 1, qrc_t: 0, roma: 1, roma_t: 0,
        songID: songId, trans: 1, trans_t: 0, type: -1,
      },
    },
  },
})

const requestLineLyric = (songmid) => {
  const requestObj = httpFetch(`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${encodeURIComponent(songmid)}&g_tk=5381&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&platform=yqq`, {
    headers: { Referer: 'https://y.qq.com/portal/player.html' },
  })
  requestObj.promise = requestObj.promise.then(({ body }) => {
    if (body.code != 0 || !body.lyric) throw new Error('TX line lyric failed')
    return {
      lyric: decodeName(Buffer.from(body.lyric, 'base64').toString('utf8')),
      tlyric: decodeName(Buffer.from(body.trans || '', 'base64').toString('utf8')),
      rlyric: '',
      lxlyric: '',
      _lyricKind: 'line',
      _lyricProvider: 'tx-lrc',
      _lyricFallbackReason: 'TX QRC unavailable; downgraded to same-platform line lyric',
    }
  })
  return requestObj
}

export default {
  getLyric(musicInfo) {
    const rawSongmid = musicInfo?.songmid || musicInfo
    const songmid = typeof rawSongmid === 'string' && rawSongmid.startsWith('tx_') ? rawSongmid.slice(3) : rawSongmid
    let activeRequest = null
    let cancelled = false
    const promise = getNumericSongId(musicInfo)
      .then(songId => {
        if (cancelled) throw new Error('Request cancelled')
        activeRequest = requestQrc(songId)
        return activeRequest.promise
      })
      .then(({ body }) => {
        if (body?.code != 0 || body?.req?.code != 0 || !body?.req?.data?.lyric) throw new Error('TX QRC request failed')
        return parseQrcResult(body.req.data)
      })
      .catch(qrcError => {
        if (cancelled) throw qrcError
        activeRequest = requestLineLyric(songmid)
        return activeRequest.promise
      })

    return {
      promise,
      cancelHttp() {
        cancelled = true
        activeRequest?.cancelHttp?.()
      },
    }
  },
}
