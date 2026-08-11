const timeFieldExp = /^(?:\[[\d:.]+\])+/g
const timeExp = /\d{1,3}(:\d{1,3}){0,2}(?:\.\d{1,3})/g

export type LyricOutputFormat = 'line' | 'word' | 'enhanced'

export interface SerializedLyrics {
    text: string
    requestedFormat: LyricOutputFormat
    actualFormat: LyricOutputFormat
    fallbackReason?: string
}

const LYRIC_OUTPUT_FORMATS = new Set<LyricOutputFormat>(['line', 'word', 'enhanced'])

export const normalizeLyricOutputFormat = (value: unknown): LyricOutputFormat => (
    LYRIC_OUTPUT_FORMATS.has(value as LyricOutputFormat) ? value as LyricOutputFormat : 'line'
)

const parseTimeMs = (value: string) => {
    const parts = value.split(':')
    const seconds = Number(parts.pop() || 0)
    const minutes = Number(parts.pop() || 0)
    const hours = Number(parts.pop() || 0)
    return Math.max(0, Math.round((hours * 3600 + minutes * 60 + seconds) * 1000))
}

const formatTimeMs = (value: number) => {
    const timeMs = Math.max(0, Math.round(value))
    const minutes = Math.floor(timeMs / 60000)
    const seconds = Math.floor((timeMs % 60000) / 1000)
    const milliseconds = timeMs % 1000
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
}

interface TimedWord {
    text: string
    start: number
    end: number
}

interface TimedLine {
    start: number
    text: string
    words: TimedWord[]
}

const parseCanonicalWordLyrics = (lxlyric: string): TimedLine[] => {
    const result: TimedLine[] = []
    for (const rawLine of lxlyric.replace(/\r/g, '').split('\n')) {
        const lineMatch = /^\[([\d:.]+)\](.*)$/.exec(rawLine.trim())
        if (!lineMatch) continue
        const lineStart = parseTimeMs(lineMatch[1])
        const body = lineMatch[2]
        const token = /<(\d+),(\d+)>/g
        const tokens: Array<{ index: number; length: number; offset: number; duration: number }> = []
        let match: RegExpExecArray | null
        while ((match = token.exec(body))) {
            tokens.push({ index: match.index, length: match[0].length, offset: Number(match[1]), duration: Number(match[2]) })
        }
        if (!tokens.length) continue
        const words: TimedWord[] = []
        for (let i = 0; i < tokens.length; i++) {
            const current = tokens[i]
            const next = tokens[i + 1]
            const text = body.slice(current.index + current.length, next?.index ?? body.length)
            if (!text) continue
            const start = lineStart + current.offset
            words.push({ text, start, end: start + Math.max(1, current.duration) })
        }
        if (words.length) result.push({ start: lineStart, text: words.map(word => word.text).join(''), words })
    }
    return result
}

const serializeTimedLines = (lines: TimedLine[], format: Exclude<LyricOutputFormat, 'line'>) => lines.map(line => {
    let output = `[${formatTimeMs(line.start)}]`
    let previousEnd = format === 'word' ? line.start : null
    for (const word of line.words) {
        const open = format === 'word' ? '[' : '<'
        const close = format === 'word' ? ']' : '>'
        if (previousEnd == null || word.start !== previousEnd) output += `${open}${formatTimeMs(word.start)}${close}`
        output += word.text
        output += `${open}${formatTimeMs(word.end)}${close}`
        previousEnd = word.end
    }
    return output
}).join('\n')

const t_rxp_1 = /^0+(\d+)/
const t_rxp_2 = /:0+(\d+)/g
const t_rxp_3 = /\.0+(\d+)/
const formatTimeLabel = (label: string) => {
    return label.replace(t_rxp_1, '$1')
        .replace(t_rxp_2, ':$1')
        .replace(t_rxp_3, '.$1')
}

const filterExtendedLyricLabel = (lrcTimeLabels: Set<string>, extendedLyric: string) => {
    const extendedLines = extendedLyric.split(/\r\n|\n|\r/)
    const lines: string[] = []
    for (let i = 0; i < extendedLines.length; i++) {
        let line = extendedLines[i].trim()
        let result = timeFieldExp.exec(line)
        if (!result) continue

        const timeField = result[0]
        const text = line.replace(timeFieldExp, '').trim()
        if (!text) continue
        let times = timeField.match(timeExp)
        if (times == null) continue

        const newTimes = times.filter((time: string) => {
            const timeStr = formatTimeLabel(time)
            return lrcTimeLabels.has(timeStr)
        })
        if (newTimes.length != times.length) {
            if (!newTimes.length) continue
            line = `[${newTimes.join('][')}]${text}`
        }
        lines.push(line)
    }

    return lines.join('\n')
}

const parseLrcTimeLabel = (lrc: string) => {
    const lines = lrc.split(/\r\n|\n|\r/)
    const linesSet = new Set<string>()
    const length = lines.length
    for (let i = 0; i < length; i++) {
        const line = lines[i].trim()
        let result = timeFieldExp.exec(line)
        if (result) {
            const timeField = result[0]
            const text = line.replace(timeFieldExp, '').trim()
            if (text) {
                const times = timeField.match(timeExp)
                if (times == null) continue
                for (let time of times) {
                    linesSet.add(formatTimeLabel(time))
                }
            }
        }
    }

    return linesSet
}

const buildAwlyric = (lrcData: any) => {
    let lrc: string[] = []
    if (lrcData.lyric) {
        lrc.push(`lrc:${Buffer.from(lrcData.lyric.trim(), 'utf-8').toString('base64')}`)
    }
    if (lrcData.tlyric) {
        lrc.push(`tlrc:${Buffer.from(lrcData.tlyric.trim(), 'utf-8').toString('base64')}`)
    }
    if (lrcData.rlyric) {
        lrc.push(`rlrc:${Buffer.from(lrcData.rlyric.trim(), 'utf-8').toString('base64')}`)
    }
    if (lrcData.lxlyric) {
        lrc.push(`awlrc:${Buffer.from(lrcData.lxlyric.trim(), 'utf-8').toString('base64')}`)
    }
    return lrc.length ? `[awlrc:${lrc.join(',')}]` : ''
}

export const serializeLyrics = (
    lrcData: any,
    requestedFormat: LyricOutputFormat = 'line',
    includeTranslation: boolean = true,
    includeRoma: boolean = true,
): SerializedLyrics => {
    const format = normalizeLyricOutputFormat(requestedFormat)
    const data = {
        lyric: lrcData?.lyric || lrcData?.lrc || '',
        tlyric: lrcData?.tlyric || '',
        rlyric: lrcData?.rlyric || '',
        lxlyric: lrcData?.lxlyric || lrcData?.klyric || '',
    }
    const timedLines = data.lxlyric ? parseCanonicalWordLyrics(data.lxlyric) : []
    const actualFormat: LyricOutputFormat = format !== 'line' && timedLines.length ? format : 'line'
    const fallbackReason = actualFormat !== format
        ? lrcData?._lyricFallbackReason || '逐字歌词不可用，已降级为逐行歌词'
        : lrcData?._lyricFallbackReason

    let text = actualFormat === 'line'
        ? data.lyric
        : serializeTimedLines(timedLines, actualFormat)
    const lineLabels = parseLrcTimeLabel(data.lyric || '')
    if (includeTranslation && data.tlyric) {
        const translation = filterExtendedLyricLabel(lineLabels, data.tlyric)
        if (translation) text = `${text.trim()}\n\n${translation}\n`
    }
    if (includeRoma && data.rlyric) {
        const roma = filterExtendedLyricLabel(lineLabels, data.rlyric)
        if (roma) text = `${text.trim()}\n\n${roma}\n`
    }

    const metadata = buildAwlyric(data)
    if (metadata) text = `${text.trim()}\n\n[yinyun-lyric-format:${actualFormat}]\n${metadata}\n`

    return { text, requestedFormat: format, actualFormat, fallbackReason }
}

export const buildLyrics = (lrcData: any, downloadAwlrc: boolean = true, downloadTlrc: boolean = true, downloadRlrc: boolean = true) => {
    const data = {
        lyric: lrcData.lyric || lrcData.lrc || '',
        tlyric: lrcData.tlyric || '',
        rlyric: lrcData.rlyric || '',
        lxlyric: lrcData.lxlyric || lrcData.klyric || '',
    }
    if (!data.tlyric && !data.rlyric && !data.lxlyric) return data.lyric

    const lrcTimeLabels = parseLrcTimeLabel(data.lyric || '')

    let lrc = data.lyric || ''
    if (downloadTlrc && data.tlyric) {
        lrc = lrc.trim() + `\n\n${filterExtendedLyricLabel(lrcTimeLabels, data.tlyric)}\n`
    }
    if (downloadRlrc && data.rlyric) {
        lrc = lrc.trim() + `\n\n${filterExtendedLyricLabel(lrcTimeLabels, data.rlyric)}\n`
    }
    if (downloadAwlrc) {
        const awlrc = buildAwlyric(data)
        if (awlrc) lrc = lrc.trim() + `\n\n${awlrc}\n`
    }
    return lrc
}
export const parseLyrics = (lrc: string) => {
    const obj: any = {
        lyric: '',
        tlyric: '',
        rlyric: '',
        lxlyric: '',
    }
    const awlrcReg = /\[awlrc:(.+)\]/
    const result = lrc.match(awlrcReg)
    if (result) {
        const awlrc = result[1]
        const pairs = awlrc.split(',')
        for (const pair of pairs) {
            const [type, data] = pair.split(':')
            const content = Buffer.from(data, 'base64').toString('utf-8')
            switch (type) {
                case 'lrc':
                    obj.lyric = content
                    break
                case 'tlrc':
                    obj.tlyric = content
                    break
                case 'rlrc':
                    obj.rlyric = content
                    break
                case 'awlrc':
                    obj.lxlyric = content
                    break
            }
        }
    } else {
        // Fallback for regular LRC without [awlrc:] tag
        // Try to split by \n\n if it was built using buildLyrics without awlrc
        const segments = lrc.split('\n\n')
        if (segments.length > 1) {
            obj.lyric = segments[0]
            // This is a bit fragile, so we only do it if the first segment looks like LRC
            if (!segments[0].includes('[00:')) {
                obj.lyric = lrc
            } else {
                // Determine if other segments are translations or romaji
                for (let i = 1; i < segments.length; i++) {
                    const seg = segments[i].trim()
                    if (!seg) continue
                    if (seg.startsWith('[awlrc:')) continue
                    // We don't have a good way to tell them apart without the tag,
                    // so we just put them in tlyric if it's empty
                    if (!obj.tlyric) obj.tlyric = seg
                    else if (!obj.rlyric) obj.rlyric = seg
                }
            }
        } else {
            obj.lyric = lrc
        }
    }

    // Add aliases for compatibility
    obj.lrc = obj.lyric
    obj.klyric = obj.lxlyric

    return obj
}
