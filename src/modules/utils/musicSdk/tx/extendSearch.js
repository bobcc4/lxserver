import { httpFetch } from '../../request'

const MUSICU_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg'

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
        return createSearchFetch(str, 1, limit, page).promise.then(({ body }) => {
            if (body.code !== 0 || body.req?.code !== 0) throw new Error('TX singer search failed: ' + (body.req?.code ?? body.code))
            const singerData = body.req?.data?.body?.singer
            const rawList = Array.isArray(singerData) ? singerData : singerData?.list || []
            const list = handleSingerResult(rawList)
            const total = Number(body.req?.data?.meta?.estimate_sum || singerData?.total || list.length)
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
        return createSearchFetch(str, 2, limit, page).promise.then(({ body }) => {
            if (body.code !== 0 || body.req?.code !== 0) throw new Error('TX album search failed: ' + (body.req?.code ?? body.code))
            const albumData = body.req?.data?.body?.item_album || body.req?.data?.body?.album
            const rawList = Array.isArray(albumData) ? albumData : albumData?.list || []
            const list = handleAlbumResult(rawList)
            const total = Number(body.req?.data?.meta?.estimate_sum || albumData?.total || list.length)
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
