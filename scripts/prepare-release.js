'use strict'

const fs = require('fs')
const path = require('path')

const version = process.argv[2]
if (!/^v\d+\.\d+\.\d+(?:[.-][0-9A-Za-z.-]+)?$/.test(version || '')) {
  throw new Error(`Invalid release version: ${version || '(empty)'}`)
}

const root = path.resolve(__dirname, '..')
const packageVersion = `v${require(path.join(root, 'package.json')).version}`
const configSource = fs.readFileSync(path.join(root, 'public', 'js', 'config.js'), 'utf8')
const webVersion = configSource.match(/version:\s*['"]([^'"]+)['"]/)?.[1]

if (version !== packageVersion || version !== webVersion) {
  throw new Error(`Version mismatch: release=${version}, package=${packageVersion}, web=${webVersion || '(missing)'}`)
}

const changelog = fs.readFileSync(path.join(root, 'changelog.md'), 'utf8')
const lines = changelog.split(/\r?\n/)
const heading = `## ${version}`
const start = lines.findIndex(line => line === heading || line.startsWith(`${heading} `))
if (start < 0) throw new Error(`Missing changelog section: ${heading}`)

let end = lines.findIndex((line, index) => index > start && line.startsWith('## '))
if (end < 0) end = lines.length
const notes = `${lines.slice(start, end).join('\n').trim()}\n`
fs.writeFileSync(path.join(root, 'RELEASE_NOTES.md'), notes)

console.log(`Prepared ${version} release notes from changelog.md`)
