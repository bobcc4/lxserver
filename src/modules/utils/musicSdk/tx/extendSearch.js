import { httpFetch } from '../../request'

const MUSICU_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg'
const SMARTBOX_URL = 'https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg'

export const createSearchRequestBody = (str, searchType, resultNum, pageNum) => ({
    comm: {
        ct: '11',
        cv: '14090508',
        v: '14090508',
        tmeAppID: 'qqmusic',
        phonetype: 'EBG-AN10',
        deviceScore: '553.47',
        devicelevel: '50',
        newdevicelevel: '20',
        rom: 'HuaWei/EMOTION/EmotionUI_14.2.0',
        os_ver: '12',
        OpenUDID: '0',
        OpenUDID2: '0',
        QIMEI36: '0',
        udid: '0',
        chid: '0',
        aid: '0',
        oaid: '0',
        taid: '0',
        tid: '0',
        wid: '0',
        uid: '0',
        sid: '0',
        modeSwitch: '6',
        teenMode: '0',
        ui_mode: '2',
        nettype: '1020',
        v4ip: '',
    },
    req: {
        method: 'DoSearchForQQMusicMobile',
        module: 'music.search.SearchCgiService',
        param: {
            search_type: searchType,
            query: str,
            page_num: pageNum,
            num_per_page: resultNum,
            highlight: 0,
            nqc_flag: 0,
            multi_zhida: 0,
            cat: 2,
            grp: 1,
            sin: 0,
            sem: 0,
        },
    },
})

const createSearchFetch = (str, searchType, resultNum, pageNum) => {
    return httpFetch(MUSICU_URL, {
        method: 'post',
        headers: {
            'User-Agent': 'QQMusic 14090508(android 12)',
            'Content-Type': 'application/json;charset=utf-8',
        },
        body: createSearchRequestBody(str, searchType, resultNum, pageNum),
    })
}

const createSmartboxFetch = str => httpFetch(`${SMARTBOX_URL}?key=${encodeURIComponent(str)}&format=json&inCharset=utf8&outCharset=utf-8`, {
    headers: {
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://y.qq.com/',
    },
})

const isSingerItem = item => item && typeof item === 'object' && (
    item.singerMID || item.singerName || (item.mid && item.name && !item.albumMID && !item.albummid)
)

const isAlbumItem = item => item && typeof item === 'object' && (
    item.albumMID || item.albummid || (item.mid && item.name && (item.singer || item.singerName))
)

const findNestedList = (value, predicate, visited = new Set()) => {
    if (!value || typeof value !== 'object' || visited.has(value)) return []
    visited.add(value)
    if (Array.isArray(value)) {
        if (value.length && value.some(predicate)) return value.filter(predicate)
        for (const item of value) {
            const result = findNestedList(item, predicate, visited)
            if (result.length) return result
        }
        return []
    }
    for (const item of Object.values(value)) {
        const result = findNestedList(item, predicate, visited)
        if (result.length) return result
    }
    return []
}

export const extractSearchList = (body, type) => {
    const responseBody = body?.req?.data?.body || {}
    const predicate = type === 'singer' ? isSingerItem : isAlbumItem
    const knownValues = type === 'singer'
        ? [responseBody.singer, responseBody.item_singer]
        : [responseBody.item_album, responseBody.album]
    for (const value of knownValues) {
        const knownList = Array.isArray(value) ? value : value?.list || value?.itemlist || value?.items
        if (Array.isArray(knownList) && knownList.length) return knownList.filter(predicate)
    }
    return findNestedList(responseBody, predicate)
}

const readSmartboxList = (body, type) => {
    const section = body?.data?.[type]
    return Array.isArray(section?.itemlist) ? section.itemlist : []
}

export const handleSingerResult = rawList => {
    if (!Array.isArray(rawList)) return []
    return rawList.map(item => {
        const mid = item.singerMID || item.mid || ''
        return {
            id: mid,
            mid,
            name: item.singerName || item.name || '',
            picUrl: item.singerPic || item.iconurl || (mid ? `https://y.gtimg.cn/music/photo_new/T001R300x300M000${mid}.jpg` : ''),
            albumSize: item.albumNum || 0,
            source: 'tx',
        }
    })
}

export const handleAlbumResult = rawList => {
    if (!Array.isArray(rawList)) return []
    return rawList.map(item => {
        const mid = item.albumMID || item.albummid || item.mid || ''
        const singerName = item.singerName || (typeof item.singer === 'string' ? item.singer : item.singer?.[0]?.name) || ''
        const singerId = item.singer_id || item.singer?.[0]?.mid || ''
        return {
            id: mid,
            mid,
            name: item.albumName || item.name || '',
            picUrl: item.pic || (mid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${mid}.jpg` : ''),
            artistName: singerName,
            artistId: singerId,
            size: item.song_count || item.songNum || item.song_num || 0,
            publishTime: item.pubTime || item.publish_date || '',
            source: 'tx',
        }
    })
}

export default {
    /**
     * 搜索歌手
     * @param {string} str 搜索关键词
     * @param {number} page 页码
     * @param {number} limit 每页数量
     */
    searchSinger(str, page = 1, limit = 20) {
        return createSearchFetch(str, 1, limit, page).promise.then(async ({ body }) => {
            if (body.code !== 0 || body.req?.code !== 0) throw new Error('TX singer search failed: ' + (body.req?.code ?? body.code))
            let rawList = extractSearchList(body, 'singer')
            if (!rawList.length) {
                const fallback = await createSmartboxFetch(str).promise
                rawList = readSmartboxList(fallback.body, 'singer')
            }
            const list = handleSingerResult(rawList)
            const total = list.length ? Math.max(list.length, Number(body.req?.data?.meta?.estimate_sum) || 0) : 0
            return {
                list,
                total,
                allPage: Math.ceil(total / limit),
                limit,
                source: 'tx',
            }
        })
    },

    /**
     * 搜索专辑
     * @param {string} str 搜索关键词
     * @param {number} page 页码
     * @param {number} limit 每页数量
     */
    searchAlbum(str, page = 1, limit = 20) {
        return createSearchFetch(str, 2, limit, page).promise.then(async ({ body }) => {
            if (body.code !== 0 || body.req?.code !== 0) throw new Error('TX album search failed: ' + (body.req?.code ?? body.code))
            let rawList = extractSearchList(body, 'album')
            if (!rawList.length) {
                const fallback = await createSmartboxFetch(str).promise
                rawList = readSmartboxList(fallback.body, 'album')
            }
            const list = handleAlbumResult(rawList)
            const total = list.length ? Math.max(list.length, Number(body.req?.data?.meta?.estimate_sum) || 0) : 0
            return {
                list,
                total,
                allPage: Math.ceil(total / limit),
                limit,
                source: 'tx',
            }
        })
    },

    handleSingerResult,
    handleAlbumResult,
}
