import path from 'node:path'

/** Resolve the persistent configuration file used by the server. */
export const resolveConfigPath = (dataPath: string, configuredPath?: string) => {
  const explicitPath = configuredPath?.trim()
  return explicitPath ? path.resolve(explicitPath) : path.join(dataPath, 'config.js')
}

