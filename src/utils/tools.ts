import { networkInterfaces } from 'node:os'
import type http from 'node:http'

export const getAddress = (): string[] => {
  const nets = networkInterfaces()
  const results: string[] = []
  // console.log(nets)

  for (const interfaceInfos of Object.values(nets)) {
    if (!interfaceInfos) continue
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    for (const interfaceInfo of interfaceInfos) {
      if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
        results.push(interfaceInfo.address)
      }
    }
  }
  return results
}

export const getIP = (request: http.IncomingMessage) => {
  let ip: string | undefined
  if (global.lx.config['proxy.enabled']) {
    const proxyIp = request.headers[global.lx.config['proxy.header']]
    if (typeof proxyIp == 'string') ip = proxyIp
  }
  ip ||= request.socket.remoteAddress

  return ip
}
