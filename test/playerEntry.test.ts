import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const playerHtml = fs.readFileSync(path.join(process.cwd(), 'public/music/index.html'), 'utf8')
const playerApp = fs.readFileSync(path.join(process.cwd(), 'public/music/app.js'), 'utf8')

test('player entry keeps hash navigation on the root page', () => {
  assert.doesNotMatch(playerHtml, /<base\b/i)
  assert.match(playerHtml, /href="#" onclick="switchTab\('search'\)"/)
})

test('player entry uses explicit internal asset URLs', () => {
  const localAssetRefs = [...playerHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map(match => match[1])
    .filter(url => /^(?:css|js|assets)\//.test(url) || url === 'app.js')

  assert.deepEqual(localAssetRefs, [])
  assert.match(playerHtml, /src="\/_player\/app\.js"/)
  assert.match(playerHtml, /href="\/_player\/css\/app\.css"/)
})

test('player defaults to line sidecar lyrics and enhanced embedded lyrics', () => {
  assert.match(playerApp, /sidecarLyricFormat:\s*'line'/)
  assert.match(playerApp, /embedLyricFormat:\s*'enhanced'/)
})

test('web player platform selectors default to QQ in the requested order', () => {
  for (const id of ['search-source', 'songlist-source', 'lb-source-select']) {
    const start = playerHtml.indexOf(`id="${id}"`)
    const end = playerHtml.indexOf('</select>', start)
    const options = [...playerHtml.slice(start, end).matchAll(/<option value="([^"]+)"/g)].map(match => match[1])
    assert.deepEqual(options, ['tx', 'wy', 'kg', 'kw', 'mg'])
  }

  assert.match(playerApp, /let currentSearch = \{ name: '', source: 'tx' \}/)
  assert.match(playerApp, /const SOURCES = \['tx', 'wy', 'kg', 'kw', 'mg'\]/)
})

test('background playback cache does not submit an administrator-only naming change', () => {
  const start = playerApp.indexOf('async function triggerServerCache')
  const end = playerApp.indexOf('\nlet lastNamingPattern', start + 1)
  const triggerSource = playerApp.slice(start, end)

  assert.ok(start >= 0)
  assert.doesNotMatch(triggerSource, /namingPattern\s*:/)
  assert.match(triggerSource, /if \(!response\.ok\)/)
})

test('lyric loading clears the previous song text before asynchronous resolution', () => {
  const start = playerApp.indexOf('async function fetchLyric')
  const end = playerApp.indexOf('\n// 辅助函数：根据当前设置应用歌词更新', start + 1)
  const fetchLyricSource = playerApp.slice(start, end)

  assert.ok(start >= 0)
  assert.match(fetchLyricSource, /currentRawLrc\s*=\s*''/)
  assert.match(fetchLyricSource, /currentRawTlrc\s*=\s*''/)
  assert.match(fetchLyricSource, /currentRawRlrc\s*=\s*''/)
  assert.match(fetchLyricSource, /currentRawKlrc\s*=\s*''/)
})
