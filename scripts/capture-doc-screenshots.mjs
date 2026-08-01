import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const baseUrl = (process.env.DOCS_BASE_URL || 'http://127.0.0.1:9527').replace(/\/$/, '')
const adminPassword = process.env.DOCS_ADMIN_PASSWORD
const syncUsername = (process.env.DOCS_SYNC_USERNAME || 'admin').trim().toLowerCase()
const syncPassword = process.env.DOCS_SYNC_PASSWORD
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outputDir = path.resolve('docs/public/screenshots')
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9333)
const escapedBaseHostname = new URL(baseUrl).hostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

if (!adminPassword || !syncPassword) {
  throw new Error('Set DOCS_ADMIN_PASSWORD and DOCS_SYNC_PASSWORD before capturing screenshots.')
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Map()
  }

  async connect() {
    this.ws = new WebSocket(this.webSocketUrl)
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(event.data)
      if (message.id) {
        const request = this.pending.get(message.id)
        if (!request) return
        this.pending.delete(message.id)
        if (message.error) request.reject(new Error(message.error.message))
        else request.resolve(message.result)
        return
      }
      const waiters = this.listeners.get(message.method) || []
      this.listeners.delete(message.method)
      for (const resolve of waiters) resolve(message.params)
    })
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  once(method, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs)
      const wrapped = value => {
        clearTimeout(timeout)
        resolve(value)
      }
      const waiters = this.listeners.get(method) || []
      waiters.push(wrapped)
      this.listeners.set(method, waiters)
    })
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }

  async navigate(url) {
    const loaded = this.once('Page.loadEventFired')
    await this.send('Page.navigate', { url })
    await loaded
  }

  async waitFor(expression, timeoutMs = 20000) {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      if (await this.evaluate(`Boolean(${expression})`)) return
      await delay(250)
    }
    throw new Error(`Timed out waiting for: ${expression}`)
  }

  async screenshot(name) {
    await delay(700)
    const { data } = await this.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    })
    await writeFile(path.join(outputDir, name), Buffer.from(data, 'base64'))
    console.log(`Captured ${name}`)
  }

  close() {
    this.ws.close()
  }
}

async function waitForChrome() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const pages = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then(response => response.json())
      const page = pages.find(item => item.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {}
    await delay(250)
  }
  throw new Error('Chrome debugging endpoint did not start.')
}

const sanitizePage = `(() => {
  const replacements = [
    [new RegExp(${JSON.stringify(escapedBaseHostname)}, 'gi'), 'music.example.com'],
    [/(?:\\d{1,3}\\.){3}\\d{1,3}/g, '192.168.x.x']
  ];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    let value = walker.currentNode.nodeValue;
    for (const [pattern, replacement] of replacements) value = value.replace(pattern, replacement);
    walker.currentNode.nodeValue = value;
  }
  document.querySelectorAll('input').forEach(input => {
    if (input.type === 'password') input.value = '********';
    else {
      let value = input.value;
      for (const [pattern, replacement] of replacements) value = value.replace(pattern, replacement);
      input.value = value;
    }
  });
  let standardUserIndex = 1;
  document.querySelectorAll('#users-list .user-row').forEach(row => {
    if (row.querySelector('.user-role-badge.admin')) return;
    const replacement = 'user' + String(standardUserIndex++).padStart(2, '0');
    const name = row.querySelector('.user-name-text');
    const avatar = row.querySelector('.user-avatar span');
    if (name) name.textContent = replacement;
    if (avatar) avatar.textContent = 'U';
  });
  document.querySelectorAll('.toast-item, #project-agreement-modal').forEach(el => el.remove());
})()`

async function main() {
  await mkdir(outputDir, { recursive: true })

  const loginResponse = await fetch(`${baseUrl}/api/user/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: syncUsername, password: syncPassword }),
  })
  const login = await loginResponse.json()
  if (!loginResponse.ok || !login.success || !login.token) throw new Error('Sync account login failed.')

  const profileDir = path.join(os.tmpdir(), `yinyun-doc-shots-${process.pid}`)
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    '--window-size=1440,900',
    'about:blank',
  ], { stdio: 'ignore' })

  let cdp
  try {
    cdp = new CdpClient(await waitForChrome())
    await cdp.connect()
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })

    await cdp.navigate(`${baseUrl}/`)
    await cdp.evaluate(`localStorage.setItem('lx_auth', ${JSON.stringify(adminPassword)}); location.reload()`)
    await cdp.waitFor("document.querySelector('#app:not(.hidden)')")
    await delay(1800)
    await cdp.evaluate(sanitizePage)
    await cdp.screenshot('admin-dashboard.png')

    await cdp.evaluate(`app.switchView('users')`)
    await cdp.waitFor("document.querySelector('#view-users.active')")
    await delay(1200)
    await cdp.evaluate(sanitizePage)
    await cdp.screenshot('admin-users.png')

    await cdp.evaluate(`app.switchView('config')`)
    await cdp.waitFor("document.querySelector('#view-config.active')")
    await delay(1200)
    await cdp.evaluate(sanitizePage)
    await cdp.screenshot('admin-config.png')

    await cdp.navigate(`${baseUrl}/music`)
    await cdp.evaluate(`(() => {
      localStorage.setItem('lx_agreement_accepted', 'true');
      localStorage.setItem('lx_sync_user', ${JSON.stringify(syncUsername)});
      localStorage.setItem('lx_sync_pass', ${JSON.stringify(syncPassword)});
      localStorage.setItem('lx_user_token', ${JSON.stringify(login.token)});
      localStorage.setItem('lx_admin_password', ${JSON.stringify(adminPassword)});
      location.reload();
    })()`)
    await cdp.waitFor("typeof switchTab === 'function' && document.querySelector('#view-search')")
    await delay(2500)
    await cdp.evaluate(`(() => {
      document.getElementById('search-input').removeAttribute('readonly');
      document.getElementById('search-input').value = '王力宏';
      document.getElementById('search-source').value = 'tx';
      void doSearch();
    })()`)
    await cdp.waitFor("document.querySelector('#search-results')?.children.length > 2", 30000)
    await delay(1200)
    await cdp.evaluate(`window.__docScreenshotSong = window.viewingPlaylist?.[0] || null`)
    await cdp.evaluate(sanitizePage)
    await cdp.screenshot('web-search.png')

    await cdp.evaluate(`switchTab('settings')`)
    await cdp.waitFor("!document.querySelector('#view-settings').classList.contains('hidden')")
    await cdp.evaluate(`document.querySelector('#quality-select')?.scrollIntoView({ block: 'center' })`)
    await delay(500)
    await cdp.evaluate(sanitizePage)
    await cdp.screenshot('web-settings.png')

    await cdp.evaluate(`switchTab('search')`)
    await cdp.waitFor("!document.querySelector('#view-search').classList.contains('hidden')")
    await cdp.evaluate(`void downloadSong(window.__docScreenshotSong, null, false, '浏览器下载')`)
    await cdp.waitFor("Array.from(document.querySelectorAll('h3')).some(el => el.textContent.includes('选择下载音质'))", 60000)
    await cdp.evaluate(sanitizePage)
    await cdp.screenshot('web-download-quality.png')

    await cdp.navigate(`${baseUrl}/music`)
    await cdp.waitFor("typeof switchTab === 'function' && document.querySelector('#view-localmusic')")
    await delay(1200)
    await cdp.evaluate(`switchTab('localmusic')`)
    await cdp.waitFor("!document.querySelector('#view-localmusic').classList.contains('hidden')")
    await cdp.waitFor("Number((document.querySelector('#lm-total-count')?.textContent || '').match(/\\d+/)?.[0] || 0) > 0", 30000)
    await delay(1200)
    await cdp.evaluate(sanitizePage)
    await cdp.screenshot('web-local-music.png')

    await cdp.evaluate(`(() => {
      window.settings.enableRemaster = true;
      switchTab('localmusic');
      setTimeout(() => window.LocalMusicManager.openRemasterModal(), 400);
    })()`)
    await cdp.waitFor("document.querySelector('#lm-remaster-modal')?.classList.contains('flex')", 30000)
    await cdp.waitFor("Number((document.querySelector('#lm-remaster-available-count')?.textContent || '').match(/\\d+/)?.[0] || 0) > 0", 30000)
    await cdp.evaluate(sanitizePage)
    await cdp.screenshot('web-remaster.png')

  } finally {
    cdp?.close()
    chrome.kill()
    await delay(500)
    await rm(profileDir, { recursive: true, force: true }).catch(() => {})
  }
}

await main()
