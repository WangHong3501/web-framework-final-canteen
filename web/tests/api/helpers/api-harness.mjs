import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { createApp } = require('../../../server/index.cjs')
const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const SEED_FILE = path.join(WEB_ROOT, 'db.json')
const LOCAL_ROOT = path.join(WEB_ROOT, '.local')

/**
 * 数据接口集成测试公共工具：每个测试文件独立运行库和凭据文件，
 * 不读写同学的 .local 数据，也不改写提交的 db.json 种子。
 */
export async function startApi({ mutateSeed } = {}) {
  fs.mkdirSync(LOCAL_ROOT, { recursive: true })
  const folder = path.join(LOCAL_ROOT, `data-api-${randomUUID()}`)
  fs.mkdirSync(folder, { recursive: true })
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'))
  if (mutateSeed) mutateSeed(seed)
  const dbFile = path.join(folder, 'db.runtime.json')
  fs.writeFileSync(dbFile, JSON.stringify(seed, null, 2))

  const app = createApp({
    dbFile,
    credentialFile: path.join(folder, 'auth.runtime.json'),
  })
  const listener = await new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server))
    server.on('error', reject)
  })
  const origin = `http://127.0.0.1:${listener.address().port}`

  async function request(
    url,
    { method = 'GET', token, body, rawBody, headers: extraHeaders } = {},
  ) {
    const headers = { ...extraHeaders }
    if (token) headers.Authorization = `Bearer ${token}`
    let payload
    if (rawBody !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = rawBody
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
    const response = await fetch(origin + url, { method, headers, body: payload })
    const text = await response.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }
    return { status: response.status, body: data, headers: response.headers }
  }

  async function login({
    account = '32605150621',
    role = 'student',
    password = 'Shiguang@2026',
  } = {}) {
    const response = await request('/auth/login', {
      method: 'POST',
      body: { account, password, role, remember: false },
    })
    if (response.status !== 200)
      throw new Error(`登录失败：${response.status} ${JSON.stringify(response.body)}`)
    return response.body.token
  }

  async function close() {
    await new Promise((resolve) => listener.close(resolve))
    fs.rmSync(folder, { recursive: true, force: true })
  }

  return { origin, request, login, close, dbFile, folder }
}

export const TEST_STUDENT = { account: '32605150621', role: 'student' }
export const TEST_MERCHANT = { account: 'merchant01', role: 'merchant' }
