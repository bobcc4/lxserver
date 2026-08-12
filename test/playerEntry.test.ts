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

test('background playback cache does not submit an administrator-only naming change', () => {
  const start = playerApp.indexOf('async function triggerServerCache')
  const end = playerApp.indexOf('\nlet lastNamingPattern', start + 1)
  const triggerSource = playerApp.slice(start, end)

  assert.ok(start >= 0)
  assert.doesNotMatch(triggerSource, /namingPattern\s*:/)
  assert.match(triggerSource, /if \(!response\.ok\)/)
})
