import test from 'node:test'
import assert from 'node:assert/strict'
import { createSearchRequestBody, extractSearchList, handleAlbumResult, handleSingerResult } from '../src/modules/utils/musicSdk/tx/extendSearch.js'

test('TX entity search uses the current mobile request contract', () => {
  const request = createSearchRequestBody('王力宏', 1, 50, 2)
  assert.equal(request.req.method, 'DoSearchForQQMusicMobile')
  assert.equal(request.req.param.search_type, 1)
  assert.equal(request.req.param.query, '王力宏')
  assert.equal(request.req.param.num_per_page, 50)
  assert.equal(request.req.param.page_num, 2)
  assert.equal(request.comm.ct, '11')
})

test('TX entity search finds alternate nested result lists', () => {
  const singer = { singerMID: '001JDzPT3JdvqK', singerName: '王力宏' }
  const album = { albumMID: '002ElVxf43rOue', albumName: '心中的日月', singerName: '王力宏' }
  assert.deepEqual(extractSearchList({ req: { data: { body: { item_singer: { items: [singer] } } } } }, 'singer'), [singer])
  assert.deepEqual(extractSearchList({ req: { data: { body: { alternate: { itemlist: [album] } } } } }, 'album'), [album])
})

test('TX singer and album results normalize current response fields', () => {
  assert.deepEqual(handleSingerResult([{
    singerMID: '001JDzPT3JdvqK',
    singerName: '王力宏',
    singerPic: 'https://img.test/artist.jpg',
    albumNum: 76,
  }])[0], {
    id: '001JDzPT3JdvqK',
    mid: '001JDzPT3JdvqK',
    name: '王力宏',
    picUrl: 'https://img.test/artist.jpg',
    albumSize: 76,
    source: 'tx',
  })

  assert.deepEqual(handleAlbumResult([{
    albummid: '002ElVxf43rOue',
    name: '心中的日月',
    singer: '王力宏',
    singer_id: '265',
    song_num: 11,
    publish_date: '2004-12-31',
    pic: 'https://img.test/album.jpg',
  }])[0], {
    id: '002ElVxf43rOue',
    mid: '002ElVxf43rOue',
    name: '心中的日月',
    picUrl: 'https://img.test/album.jpg',
    artistName: '王力宏',
    artistId: '265',
    size: 11,
    publishTime: '2004-12-31',
    source: 'tx',
  })
})
