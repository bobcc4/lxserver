import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { resolveConfigPath } from '../src/configPath'

test('configuration defaults to the persistent data directory', () => {
  const dataPath = path.join(process.cwd(), '.tmp-config-data')
  assert.equal(resolveConfigPath(dataPath), path.join(dataPath, 'config.js'))
})

test('explicit CONFIG_PATH remains authoritative', () => {
  const dataPath = path.join(process.cwd(), '.tmp-config-data')
  const explicitPath = path.join(process.cwd(), '.tmp-config', 'yinyun.js')
  assert.equal(resolveConfigPath(dataPath, explicitPath), path.resolve(explicitPath))
})

test('blank CONFIG_PATH uses the persistent default', () => {
  const dataPath = path.join(process.cwd(), '.tmp-config-data')
  assert.equal(resolveConfigPath(dataPath, '  '), path.join(dataPath, 'config.js'))
})
