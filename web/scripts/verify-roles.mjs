/**
 * 双角色权限矩阵验收（独立临时 DB，零污染真实数据）
 * 覆盖：管理员/学生登录、可见数据隔离、下单权限、状态流转、跨角色越权、订单写保护。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const { createApp } = require(path.join(root, 'server/index.cjs'))

const seed = JSON.parse(fs.readFileSync(path.join(root, 'db.json'), 'utf8'))
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'role-verify-'))
const dbFile = path.join(tmpDir, 'db.json')
seed.orders = []
fs.writeFileSync(dbFile, JSON.stringify(seed))

const PORT = 3199
const app = createApp({ dbFile, credentialFile: path.join(tmpDir, 'auth.json') })
const listener = await new Promise((resolve) => {
  const l = app.listen(PORT, '127.0.0.1', () => resolve(l))
})
const base = `http://127.0.0.1:${PORT}`

let pass = 0
let fail = 0
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`) }
  else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`) }
}
async function req(p, opts = {}) {
  const r = await fetch(base + p, opts)
  let d; try { d = await r.json() } catch { d = null }
  return { status: r.status, data: d }
}
function H(token) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
async function login(account, role) {
  return req('/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, password: 'Shiguang@2026', role }),
  })
}

try {
  const stu = await login('32605150621', 'student')
  const mer = await login('merchant01', 'merchant')
  check('学生登录', stu.status === 200 && !!stu.data.token)
  check('管理员登录', mer.status === 200 && !!mer.data.token)
  const sH = H(stu.data.token), mH = H(mer.data.token)

  const dishes = (await req('/dishes', { headers: sH })).data
  const sellable = dishes.find(d => d.status !== 'danger' && !d.soldOut)

  // 学生下单
  const created = await req('/orders', { method: 'POST', headers: sH,
    body: JSON.stringify({ meal: 'lunch', items: [{ dishId: sellable.id, qty: 2 }] }) })
  check('学生可下单', created.status === 201, 'status=' + created.status)
  const oid = created.data?.id

  // 商家不能下单
  const merOrder = await req('/orders', { method: 'POST', headers: mH,
    body: JSON.stringify({ items: [{ dishId: sellable.id, qty: 1 }] }) })
  check('管理员不可下单', merOrder.status === 403, 'status=' + merOrder.status)

  // 数据可见性隔离
  const stuOrders = (await req('/orders', { headers: sH })).data
  const merOrders = (await req('/orders', { headers: mH })).data
  check('学生只见自己订单', Array.isArray(stuOrders) && stuOrders.every(o => o.userId === 'student-1'))
  check('管理员见全部订单', Array.isArray(merOrders) && merOrders.length >= 1)

  // 商家推进状态 preparing -> ready
  const advanced = await req(`/orders/${oid}`, { method: 'PUT', headers: mH, body: JSON.stringify({ action: 'next' }) })
  check('管理员推进订单状态', advanced.status === 200 && advanced.data.status === 'ready', 'status=' + advanced.data?.status)

  // 学生提前确认（now ready，应成功）
  const confirmed = await req(`/orders/${oid}`, { method: 'PUT', headers: sH, body: JSON.stringify({ action: 'confirm' }) })
  check('学生确认取餐 ready→completed', confirmed.status === 200 && confirmed.data.status === 'completed', 'status=' + confirmed.data?.status)

  // 学生不能用 next 推进
  const stuNext = await req(`/orders/${oid}`, { method: 'PUT', headers: sH, body: JSON.stringify({ action: 'next' }) })
  check('学生不可推进商家状态', stuNext.status === 403, 'status=' + stuNext.status)

  // 商家不能 confirm
  const merConfirm = await req(`/orders/${oid}`, { method: 'PUT', headers: mH, body: JSON.stringify({ action: 'confirm' }) })
  check('管理员不可确认取餐', merConfirm.status === 422, 'status=' + merConfirm.status)

  // 学生改菜品被拒
  const stuDish = await req(`/dishes/${sellable.id}`, { method: 'PUT', headers: sH, body: JSON.stringify({ price: 0.01 }) })
  check('学生不可改菜品', stuDish.status === 403, 'status=' + stuDish.status)

  // 管理员改菜品允许（归属 stall-1）
  const ownDish = dishes.find(d => d.stallId === 'stall-1')
  const merDish = await req(`/dishes/${ownDish.id}`, { method: 'PUT', headers: mH,
    body: JSON.stringify({ ...ownDish, price: ownDish.price }) })
  check('管理员可改本档口菜品', merDish.status === 200 || merDish.status === 201, 'status=' + merDish.status)

  // 篡改价格无效（服务端核价）
  const tamper = await req('/orders', { method: 'POST', headers: sH,
    body: JSON.stringify({ items: [{ dishId: sellable.id, qty: 1 }], total: 0.01 }) })
  const expect = sellable.price
  check('服务端核价防篡改', Math.abs(tamper.data.total - expect) < 0.01, `total=${tamper.data.total} expect=${expect}`)

  // 售罄拦截
  const sold = dishes.find(d => d.status === 'danger' || d.soldOut)
  if (sold) {
    const soldReq = await req('/orders', { method: 'POST', headers: sH,
      body: JSON.stringify({ items: [{ dishId: sold.id, qty: 1 }] }) })
    check('售罄菜品拦截', soldReq.status === 422, 'status=' + soldReq.status)
  }

  // 未登录访问被拒
  const anon = await req('/dishes')
  check('未登录访问拦截', anon.status === 401, 'status=' + anon.status)

  console.log(`\n===== 权限矩阵：${pass}/${pass + fail} PASS, ${fail} FAIL =====`)
} finally {
  await new Promise((resolve) => listener.close(resolve))
  fs.rmSync(tmpDir, { recursive: true, force: true })
  console.log('临时测试库已清理')
}
process.exit(fail ? 1 : 0)
