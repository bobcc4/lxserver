import path from 'node:path'
import log4js from 'log4js'

const LOG_MAX_SIZE = 1024 * 1024 * 10
const LOG_BACKUPS = 10
const REDACTED_VALUE = 'REDACTED'
const SENSITIVE_QUERY_PARAMS = new Set([
  'access_token',
  'apikey',
  'api_key',
  'auth',
  'auth_key',
  'authorization',
  'client_secret',
  'cookie',
  'key',
  'p',
  'pass',
  'password',
  'pwd',
  'refresh_token',
  's',
  'secret',
  'sign',
  'signature',
  't',
  'token',
  'vkey',
  'wssecret',
])

const SENSITIVE_NAME_PATTERN = Array.from(SENSITIVE_QUERY_PARAMS).join('|')
const SENSITIVE_INLINE_PATTERN = new RegExp(`((?:^|[?&,;{\\s])["']?(?:${SENSITIVE_NAME_PATTERN})["']?\\s*[:=]\\s*["']?)([^\\s&,;"'}]+)`, 'gi')

export const sanitizeLogText = (value: string) => value
  .replace(/(https?:\/\/)([^:@/\s]+):([^@/\s]+)@/gi, '$1REDACTED:REDACTED@')
  .replace(SENSITIVE_INLINE_PATTERN, `$1${REDACTED_VALUE}`)

const sanitizeLogArgument = (value: any, seen = new WeakSet<object>(), depth = 0): any => {
  if (typeof value === 'string') return sanitizeLogText(value)
  if (value instanceof Error) {
    const error = new Error(sanitizeLogText(value.message))
    error.name = value.name
    if (value.stack) error.stack = sanitizeLogText(value.stack)
    return error
  }
  if (value == null || typeof value !== 'object') return value
  if (depth >= 4) return '[MaxDepth]'
  if (value instanceof URL) return sanitizeLogText(value.toString())
  if (Buffer.isBuffer(value) || value instanceof Date) return value
  if (seen.has(value)) return '[Circular]'
  seen.add(value)

  if (Array.isArray(value)) {
    const result = value.map(item => sanitizeLogArgument(item, seen, depth + 1))
    seen.delete(value)
    return result
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    seen.delete(value)
    return value
  }

  const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SENSITIVE_QUERY_PARAMS.has(key.toLowerCase()) ? REDACTED_VALUE : sanitizeLogArgument(item, seen, depth + 1),
  ]))
  seen.delete(value)
  return result
}

export const sanitizeAccessUrl = (rawUrl = '') => {
  try {
    const url = new URL(rawUrl, 'http://localhost')
    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) url.searchParams.set(key, REDACTED_VALUE)
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return sanitizeLogText(rawUrl)
  }
}

const createLogConfig = (logPath: string) => ({
  appenders: {
    access: {
      type: 'file',
      filename: path.join(logPath, 'access.log'),
      maxLogSize: LOG_MAX_SIZE,
      backups: LOG_BACKUPS,
      keepFileExt: true,
    },
    app: {
      type: 'file',
      filename: path.join(logPath, 'app.log'),
      maxLogSize: LOG_MAX_SIZE,
      backups: LOG_BACKUPS,
      keepFileExt: true,
    },
    errorFile: {
      type: 'file',
      filename: path.join(logPath, 'errors.log'),
      maxLogSize: LOG_MAX_SIZE,
      backups: LOG_BACKUPS,
      keepFileExt: true,
    },
    errors: {
      type: 'logLevelFilter',
      level: 'ERROR',
      appender: 'errorFile',
    },
    console: {
      type: 'console',
    },
    login: {
      type: 'file',
      filename: path.join(logPath, 'login.log'),
      maxLogSize: LOG_MAX_SIZE,
      backups: LOG_BACKUPS,
      keepFileExt: true,
    },
    token: {
      type: 'file',
      filename: path.join(logPath, 'token.log'),
      maxLogSize: LOG_MAX_SIZE,
      backups: LOG_BACKUPS,
      keepFileExt: true,
    },
  },
  categories: {
    default: { appenders: ['app', 'errors', 'console'], level: 'DEBUG' },
    access: { appenders: ['access', 'errors'], level: 'ALL' },
    login: { appenders: ['login', 'errors'], level: 'ALL' },
    token: { appenders: ['token', 'errors'], level: 'ALL' },
  },
})

let consoleRedirected = false

const redirectConsoleToLogger = () => {
  if (consoleRedirected) return
  consoleRedirected = true

  const appLog = log4js.getLogger('app')
  const sanitizeArgs = (args: any[]) => args.map(arg => sanitizeLogArgument(arg))
  console.log = (message?: any, ...args: any[]) => appLog.info(sanitizeLogArgument(message), ...sanitizeArgs(args))
  console.info = (message?: any, ...args: any[]) => appLog.info(sanitizeLogArgument(message), ...sanitizeArgs(args))
  console.warn = (message?: any, ...args: any[]) => appLog.warn(sanitizeLogArgument(message), ...sanitizeArgs(args))
  console.error = (message?: any, ...args: any[]) => appLog.error(sanitizeLogArgument(message), ...sanitizeArgs(args))
  console.debug = (message?: any, ...args: any[]) => appLog.debug(sanitizeLogArgument(message), ...sanitizeArgs(args))
}

export const initLogger = () => {
  log4js.configure(createLogConfig(global.lx.logPath))
  redirectConsoleToLogger()
}

export const startupLog = log4js.getLogger('startup')
export const syncLog = log4js.getLogger('sync')
export const accessLog = log4js.getLogger('access')
export const loginLog = log4js.getLogger('login')
export const tokenLog = log4js.getLogger('token')
