import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
const require = createRequire(import.meta.url)
const { createApp } = require('../../server/index.cjs')
let listener, origin
let clock = Date.now()
const root = path.resolve('.local')
const folder = path.join(root, `api-test-${randomUUID()}`)

before(async () => {
  fs.mkdirSync(folder, { recursive: true })
  const seed = JSON.parse(fs.readFileSync('db.json', 'utf8'))
  seed.orders = [
    { id: 'own-order', userId: 'student-1', total: 18, status: 'pending' },
    { id: 'other-order', userId: 'someone-else', total: 24, status: 'completed' },
  ]
  fs.writeFileSync(path.join(folder, 'db.runtime.json'), JSON.stringify(seed))
  const app = createApp({
    dbFile: path.join(folder, 'db.runtime.json'),
    credentialFile: path.join(folder, 'auth.runtime.json'),
    clock: () => clock,
  })
  await new Promise((resolve) => {
    listener = app.listen(0, '127.0.0.1', resolve)
  })
  origin = `http://127.0.0.1:${listener.address().port}`
})
after(async () => {
  if (listener) await new Promise((resolve) => listener.close(resolve))
  assert.equal(path.dirname(path.resolve(folder)), root)
  for (const file of ['db.runtime.json', 'auth.runtime.json'])
    if (fs.existsSync(path.join(folder, file))) fs.unlinkSync(path.join(folder, file))
  fs.rmdirSync(folder)
})
async function request(url, { method = 'GET', token, body } = {}) {
  const res = await fetch(origin + url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: res.status, body: res.status === 204 ? null : await res.json() }
}
async function login(overrides = {}) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: {
      account: '32605150621',
      password: 'Shiguang@2026',
      role: 'student',
      remember: false,
      ...overrides,
    },
  })
  assert.equal(res.status, 200)
  return res.body
}

test('未登录和伪造 token 不能读取个人信息', async () => {
  assert.equal((await request('/me')).status, 401)
  assert.equal((await request('/me', { token: 'a'.repeat(64) })).status, 401)
})
test('错误密码与冒充商家都无法登录', async () => {
  for (const overrides of [{ password: 'wrong' }, { role: 'merchant' }]) {
    const response = await request('/auth/login', {
      method: 'POST',
      body: { account: '32605150621', password: 'Shiguang@2026', role: 'student', ...overrides },
    })
    assert.equal(response.status, 401)
    assert.equal(response.body.code, 'INVALID_CREDENTIALS')
  }
})
test('登录返回脱敏身份，会话可核验，不能读取原始用户库', async () => {
  const session = await login()
  assert.equal(session.user.role, 'student')
  assert.match(session.token, /^[a-f0-9]{64}$/)
  assert.equal(JSON.stringify(session.user).includes('password'), false)
  assert.equal((await request('/auth/session', { token: session.token })).body.user.id, 'student-1')
  assert.equal((await request('/users', { token: session.token })).status, 403)
  assert.equal((await request('/users/student-1', { token: session.token })).status, 403)
  assert.equal((await request('/db', { token: session.token })).status, 403)
})
test('资料修改后重新 GET 能读回，身份字段禁止篡改', async () => {
  const { token } = await login()
  const profile = {
    displayName: '食光测试同学',
    phone: '',
    email: 'demo@example.com',
    canteen: '第二食堂',
    avatarTone: 'sky',
  }
  assert.equal((await request('/me/profile', { method: 'PUT', token, body: profile })).status, 200)
  const fetched = await request('/me', { token })
  assert.equal(fetched.body.displayName, profile.displayName)
  assert.equal(fetched.body.canteen, profile.canteen)
  assert.equal(
    (await request('/me/profile', { method: 'PUT', token, body: { ...profile, role: 'merchant' } }))
      .status,
    422,
  )
  assert.equal((await request('/me', { token })).body.role, 'student')
  assert.equal(
    (await request('/me/profile', { method: 'PUT', token, body: { ...profile, phone: '123' } }))
      .status,
    422,
  )
})
test('偏好保存可回读，非法枚举不写入', async () => {
  const { token } = await login()
  const preferences = {
    spice: 'medium',
    cuisines: ['轻食蔬菜'],
    avoidIngredients: ['香菜'],
    mealTime: '12:00–12:30',
  }
  assert.equal(
    (await request('/me/preferences', { method: 'PUT', token, body: preferences })).status,
    200,
  )
  assert.deepEqual((await request('/me', { token })).body.preferences, preferences)
  assert.equal(
    (
      await request('/me/preferences', {
        method: 'PUT',
        token,
        body: { ...preferences, spice: 'invalid' },
      })
    ).status,
    422,
  )
})
test('账户摘要和订单接口只展示当前用户订单', async () => {
  const { token } = await login()
  const summary = await request('/me/summary', { token })
  assert.equal(summary.body.totalOrders, 1)
  assert.equal(summary.body.pendingOrders, 1)
  assert.deepEqual(
    (await request('/orders', { token })).body.map((order) => order.id),
    ['own-order'],
  )
  assert.equal((await request('/orders/other-order', { token })).status, 404)
  assert.equal(
    (await request('/dishes', { method: 'POST', token, body: { name: 'forbidden' } })).status,
    403,
  )
})
test('退出会话后 token 立即失效', async () => {
  const { token } = await login()
  assert.equal((await request('/auth/session', { method: 'DELETE', token })).status, 204)
  assert.equal((await request('/me', { token })).status, 401)
})
test('会话到期后服务端拒绝恢复，重新登录可继续使用', async () => {
  const session = await login()
  clock = session.expiresAt + 1
  assert.equal((await request('/auth/session', { token: session.token })).status, 401)
  const fresh = await login()
  assert.equal((await request('/me', { token: fresh.token })).status, 200)
})
test('修改密码后所有旧会话失效，新密码可登录', async () => {
  const first = await login()
  const second = await login()
  const response = await request('/me/password', {
    method: 'PUT',
    token: first.token,
    body: { currentPassword: 'Shiguang@2026', newPassword: 'FreshMeal@2026' },
  })
  assert.equal(response.status, 200)
  assert.equal((await request('/me', { token: first.token })).status, 401)
  assert.equal((await request('/me', { token: second.token })).status, 401)
  const updated = await login({ password: 'FreshMeal@2026' })
  assert.equal(updated.user.id, 'student-1')
})
