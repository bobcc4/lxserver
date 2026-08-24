import crypto from 'node:crypto'
import dgram from 'node:dgram'
import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'

export type CastAction = 'play' | 'pause' | 'stop' | 'volume'

type DeviceService = { serviceType: string, controlURL: string }
export type CastDevice = {
  id: string
  location: string
  friendlyName: string
  modelName: string
  services: DeviceService[]
}

type CastSession = {
  id: string
  username: string
  filename: string
  folder: 'cache' | 'music'
  location?: string
  device: CastDevice
  streamUrl: string
  expiresAt: number
  title?: string
  artist?: string
  album?: string
  duration?: string
}

const AV_TRANSPORT = 'urn:schemas-upnp-org:service:AVTransport:1'
const RENDERING_CONTROL = 'urn:schemas-upnp-org:service:RenderingControl:1'
const SESSION_TTL = 10 * 60 * 1000
const soapEscape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]!))

const parseHeaders = (message: string) => Object.fromEntries(message.split(/\r?\n/).slice(1).map(line => {
  const index = line.indexOf(':')
  return index > 0 ? [line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim()] : ['', '']
}).filter(([key]) => key))

const textTag = (xml: string, tag: string) => xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'))?.[1]?.trim() || ''

const fetchText = (target: string, timeoutMs = 4000) => new Promise<string>((resolve, reject) => {
  const parsed = new URL(target)
  const transport = parsed.protocol === 'https:' ? https : http
  const request = transport.get(parsed, { timeout: timeoutMs, headers: { 'User-Agent': 'Yinyun/1.6.2 DLNA' } }, response => {
    if ((response.statusCode || 500) >= 400) { response.resume(); reject(new Error(`HTTP ${response.statusCode}`)); return }
    const chunks: Buffer[] = []
    response.on('data', chunk => chunks.push(Buffer.from(chunk)))
    response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
  request.on('timeout', () => request.destroy(new Error('Request timed out')))
  request.on('error', reject)
})

const resolveUrl = (base: string, value: string) => new URL(value, base).toString()

const parseDevice = async (location: string, usn: string): Promise<CastDevice | null> => {
  const xml = await fetchText(location)
  const services: DeviceService[] = []
  const servicePattern = /<service>([\s\S]*?)<\/service>/gi
  for (const match of xml.matchAll(servicePattern)) {
    const serviceType = textTag(match[1], 'serviceType')
    const control = textTag(match[1], 'controlURL')
    if (serviceType && control && [AV_TRANSPORT, RENDERING_CONTROL].includes(serviceType)) {
      services.push({ serviceType, controlURL: resolveUrl(location, control) })
    }
  }
  if (!services.some(service => service.serviceType === AV_TRANSPORT)) return null
  const id = crypto.createHash('sha256').update(usn || location).digest('hex').slice(0, 24)
  return { id, location, friendlyName: textTag(xml, 'friendlyName') || 'DLNA Renderer', modelName: textTag(xml, 'modelName'), services }
}

export const discoverDlnaDevices = async (timeoutMs = 2500): Promise<CastDevice[]> => await new Promise(resolve => {
  const socket = dgram.createSocket('udp4')
  const found = new Map<string, Promise<CastDevice | null>>()
  const message = Buffer.from([
    'M-SEARCH * HTTP/1.1',
    'HOST: 239.255.255.250:1900',
    'MAN: "ssdp:discover"',
    'MX: 2',
    'ST: urn:schemas-upnp-org:device:MediaRenderer:1',
    '',
    '',
  ].join('\r\n'))
  const finish = () => {
    clearTimeout(timer)
    try { socket.close() } catch { }
    void Promise.all(found.values()).then(items => resolve(items.filter((item): item is CastDevice => !!item)))
  }
  const timer = setTimeout(finish, timeoutMs)
  socket.on('message', data => {
    const headers = parseHeaders(data.toString('utf8'))
    const location = headers.location
    if (!location || found.has(location)) return
    found.set(location, parseDevice(location, headers.usn || location).catch(error => {
      console.warn(`[DLNA] Failed to parse ${location}: ${error.message}`)
      return null
    }))
  })
  socket.on('error', finish)
  socket.bind(() => { try { socket.send(message, 0, message.length, 1900, '239.255.255.250') } catch { finish() } })
})

const soapRequest = async (controlURL: string, serviceType: string, action: string, args: Record<string, string>) => {
  const body = Object.entries(args).map(([key, value]) => `<${key}>${soapEscape(value)}</${key}>`).join('')
  const xml = `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:${action} xmlns:u="${serviceType}">${body}</u:${action}></s:Body></s:Envelope>`
  return await new Promise<void>((resolve, reject) => {
    const parsed = new URL(controlURL)
    const transport = parsed.protocol === 'https:' ? https : http
    const request = transport.request(parsed, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset="utf-8"', SOAPAction: `"${serviceType}#${action}"`, 'Content-Length': Buffer.byteLength(xml) }, timeout: 5000 }, response => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(Buffer.from(chunk)))
      response.on('end', () => (response.statusCode || 500) >= 300 ? reject(new Error(`DLNA SOAP HTTP ${response.statusCode}`)) : resolve())
    })
    request.on('timeout', () => request.destroy(new Error('DLNA SOAP timed out')))
    request.on('error', reject)
    request.end(xml)
  })
}

const getService = (device: CastDevice, type: string) => device.services.find(service => service.serviceType === type)?.controlURL

export class CastManager {
  private readonly sessions = new Map<string, CastSession>()
  private readonly devices = new Map<string, CastDevice>()

  async discover() {
    const devices = await discoverDlnaDevices()
    for (const device of devices) this.devices.set(device.id, device)
    return devices.map(({ services, ...device }) => ({ ...device, supportsVolume: services.some(service => service.serviceType === RENDERING_CONTROL) }))
  }

  getDevice(id: string) {
    return this.devices.get(id) || null
  }

  private cleanup() {
    const now = Date.now()
    for (const [id, session] of this.sessions) if (session.expiresAt <= now) this.sessions.delete(id)
  }

  createSession(input: Omit<CastSession, 'id' | 'expiresAt'>) {
    this.cleanup()
    const id = crypto.randomBytes(18).toString('base64url')
    const session = { ...input, id, expiresAt: Date.now() + SESSION_TTL }
    this.sessions.set(id, session)
    return session
  }

  getSession(id: string, username: string) {
    this.cleanup()
    const session = this.sessions.get(id)
    if (!session || session.username !== username) return null
    return session
  }

  getMediaSession(id: string) {
    this.cleanup()
    return this.sessions.get(id) || null
  }

  async setUriAndPlay(session: CastSession) {
    const controlURL = getService(session.device, AV_TRANSPORT)
    if (!controlURL) throw new Error('DLNA device does not expose AVTransport')
    const duration = session.duration && /^\d{1,2}:\d{2}:\d{2}$/.test(session.duration) ? session.duration : '00:00:00'
    const metadata = `<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"><item id="0" parentID="-1" restricted="1"><dc:title>${soapEscape(session.title || session.filename)}</dc:title><dc:creator>${soapEscape(session.artist || '')}</dc:creator><upnp:album>${soapEscape(session.album || '')}</upnp:album><res protocolInfo="http-get:*:audio/*:*"><![CDATA[${session.streamUrl}]]></res></item></DIDL-Lite>`
    await soapRequest(controlURL, AV_TRANSPORT, 'SetAVTransportURI', { InstanceID: '0', CurrentURI: session.streamUrl, CurrentURIMetaData: metadata })
    await soapRequest(controlURL, AV_TRANSPORT, 'Play', { InstanceID: '0', Speed: '1' })
  }

  async control(session: CastSession, action: CastAction, volume?: number) {
    const controlURL = getService(session.device, action === 'volume' ? RENDERING_CONTROL : AV_TRANSPORT)
    if (!controlURL) throw new Error(`DLNA device does not support ${action}`)
    if (action === 'volume') {
      const value = Math.max(0, Math.min(100, Math.round(Number(volume))))
      await soapRequest(controlURL, RENDERING_CONTROL, 'SetVolume', { InstanceID: '0', Channel: 'Master', DesiredVolume: String(value) })
      return
    }
    await soapRequest(controlURL, AV_TRANSPORT, action === 'play' ? 'Play' : action === 'pause' ? 'Pause' : 'Stop', action === 'play' ? { InstanceID: '0', Speed: '1' } : { InstanceID: '0' })
  }

  remove(id: string, username: string) {
    const session = this.getSession(id, username)
    if (!session) return false
    this.sessions.delete(id)
    return true
  }
}

export const castTest = { parseHeaders, parseDevice, soapEscape }
