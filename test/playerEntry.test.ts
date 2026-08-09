import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const playerHtml = fs.readFileSync(path.join(process.cwd(), 'public/music/index.html'), 'utf8')

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
