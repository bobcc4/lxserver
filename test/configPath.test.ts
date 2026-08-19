import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { resolveConfigPath } from '../src/configPath'

test('configuration defaults to the persistent data directory', () => {
  assert.equal(resolveConfigPath('D:/yinyun/data'), path.resolve('D:/yinyun/data/config.js'))
})

test('explicit CONFIG_PATH remains authoritative', () => {
  assert.equal(resolveConfigPath('D:/yinyun/data', 'D:/config/yinyun.js'), path.resolve('D:/config/yinyun.js'))
})

test('blank CONFIG_PATH uses the persistent default', () => {
  assert.equal(resolveConfigPath('D:/yinyun/data', '  '), path.resolve('D:/yinyun/data/config.js'))
})

