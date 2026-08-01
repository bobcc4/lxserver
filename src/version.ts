import fs from 'node:fs'
import path from 'node:path'

const readPackageVersion = () => {
  for (const packagePath of [
    path.join(__dirname, '..', 'package.json'),
    path.join(process.cwd(), 'package.json'),
  ]) {
    try {
      const value = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
      if (typeof value.version === 'string' && value.version.trim()) return value.version.trim()
    } catch { }
  }
  return '0.0.0'
}

export const APP_VERSION = readPackageVersion()
export const APP_VERSION_TAG = `v${APP_VERSION}`
