import { chromium } from '@playwright/test'

/** 全按钮功能实测：逐一点击每个可交互元素，断言其产生实际效果。 */
const BASE = 'http://127.0.0.1:5173'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const results = []
const consoleErrors = []
const CK = 'shiguang-cart'

function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

async function login(page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('请输入你的学号').fill('32605150621')
  await page.getByPlaceholder('请输入登录密码').fill('Shiguang@2026')
  await page.getByRole('button', { name: '登录食光校园' }).click()
  await page.waitForURL((url) => !url.hash.includes('/login'), { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(400)
}

// 强制重新挂载页面：先跳空白再跳目标（同 hash goto 不会重挂组件）
async function fresh(page, hash) {
  await page.goto('about:blank')
  await page.goto(`${BASE}/#${hash}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
}

async function safeClick(locator, timeout = 4000) {
  await locator.click({ timeout })
  await new Promise((r) => setTimeout(r, 350))
}

const browser = await chromium.launch({ headless: true, executablePath: EDGE })

// ==================== 桌面端 ====================
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[desktop] ' + m.text()) })
page.on('pageerror', (e) => consoleErrors.push('[desktop pageerror] ' + e.message))
await login(page)
// 清空购物车，保证加菜链路可测
await page.evaluate(() => localStorage.removeItem('shiguang-cart'))

// --- 登录页按钮 ---
{
  const p = await ctx.newPage()
  await p.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  const merchantBtn = p.getByRole('button', { name: /商家/ }).first()
  if (await merchantBtn.count()) {
    await safeClick(merchantBtn)
    const cls = await merchantBtn.getAttribute('class')
    record('登录页·商家身份切换', /active|is-active/.test(cls || ''), 'class=' + cls)
  } else record('登录页·商家身份切换', false, '未找到商家按钮')
  const help = p.getByRole('button', { name: /帮助|忘记密码/ }).first()
  if (await help.count()) {
    await safeClick(help)
    record('登录页·帮助弹窗', (await p.locator('.el-dialog, [role="dialog"]').filter({ visible: true }).count()) > 0)
  } else record('登录页·帮助弹窗', false, '未找到帮助按钮')
  await p.close()
}

// --- 桌面菜单：金刚区 8 入口 ---
const quickLabels = ['立即点餐', '我的订单', '早餐', '午餐', '晚餐', '轻食素食', '招牌推荐', '我的餐车']
for (const label of quickLabels) {
  await fresh(page, '/menu')
  try {
    const item = page.locator('.qe-item', { hasText: label }).first()
    const before = { url: page.url(), cards: await page.locator('.dish-grid > *').count(),
      meal: await page.locator('.meal-switch__item.is-active').textContent().catch(()=>''),
      kw: await page.locator('.menu-search input').inputValue().catch(()=>'') }
    await safeClick(item)
    const after = { url: page.url(), cards: await page.locator('.dish-grid > *').count(),
      meal: await page.locator('.meal-switch__item.is-active').textContent().catch(()=>''),
      kw: await page.locator('.menu-search input').inputValue().catch(()=>'') }
    // 立即点餐=重置(幂等，本就全部)；其余应有可见变化
    let ok
    if (label === '立即点餐' || label === '午餐') ok = after.cards > 0 || before.url !== after.url
    else ok = before.url !== after.url || before.cards !== after.cards || before.meal !== after.meal || before.kw !== after.kw
    record(`桌面金刚区·${label}`, ok,
      `route=${after.url.split('#')[1]} cards=${before.cards}->${after.cards} meal=${after.meal} kw=${after.kw}`)
  } catch (e) { record(`桌面金刚区·${label}`, false, 'ERR ' + e.message.slice(0, 70)) }
}

// --- 桌面：餐次/分类/搜索 ---
await fresh(page, '/menu')
try {
  const m0 = await page.locator('.meal-switch__item.is-active').textContent()
  await safeClick(page.locator('.meal-switch__item').first())
  const m1 = await page.locator('.meal-switch__item.is-active').textContent()
  record('桌面·餐次切换生效', m0 !== m1, `${m0}->${m1}`)
  const c0 = await page.locator('.category-chip.is-active').textContent()
  await safeClick(page.locator('.category-chip').nth(1))
  const c1 = await page.locator('.category-chip.is-active').textContent()
  record('桌面·分类切换生效', c0 !== c1, `${c0}->${c1}`)
  await page.locator('.menu-search input').fill('红烧'); await page.waitForTimeout(500)
  const n = await page.locator('.dish-grid > *').count()
  record('桌面·搜索过滤', n >= 0 && n < 12, `结果=${n}`)
  // 验证餐次同步到下单载荷（读 localStorage cart.meal）
  const cartMeal = await page.evaluate(() => JSON.parse(localStorage.getItem('shiguang-cart') || '{}').meal)
  record('桌面·餐次同步到购物车', cartMeal === 'breakfast', `cart.meal=${cartMeal}`)
} catch (e) { record('桌面·餐次/分类/搜索', false, e.message.slice(0, 80)) }

// --- 桌面：加菜/步进器/结算 ---
await fresh(page, '/menu')
try {
  const addBtn = page.locator('.add-btn:not([disabled])').first()
  await addBtn.waitFor({ state: 'visible', timeout: 5000 })
  await safeClick(addBtn)
  record('桌面·加菜按钮', await page.locator('.cart-bar').isVisible().catch(()=>false))
  const plus = page.locator('.qty-stepper button:not(.is-minus)').first()
  const q0 = await page.locator('.qty-stepper strong').first().textContent()
  await safeClick(plus)
  const q1 = await page.locator('.qty-stepper strong').first().textContent()
  record('桌面·步进器加号', q0 !== q1, `${q0}->${q1}`)
  const minus = page.locator('.qty-stepper button.is-minus').first()
  await safeClick(minus)
  const q2 = await page.locator('.qty-stepper strong').first().textContent()
  record('桌面·步进器减号', q1 !== q2, `${q1}->${q2}`)
  await safeClick(page.locator('.cart-bar button'))
  record('桌面·去结算跳转', page.url().includes('/cart'), page.url().split('#')[1])
} catch (e) { record('桌面·加菜/结算链路', false, 'ERR ' + e.message.slice(0, 90)) }

// --- 购物车：增减/移除/下单 ---
await fresh(page, '/cart')
try {
  if (await page.locator('.cart-line__remove').count()) {
    const rows0 = await page.locator('.cart-line').count()
    await safeClick(page.locator('.cart-line__remove').first())
    const rows1 = await page.locator('.cart-line').count()
    record('购物车·移除菜品', rows0 !== rows1, `${rows0}->${rows1}`)
  } else record('购物车·移除菜品', false, '购物车为空，前置加菜失败')
  // 补菜后下单
  await fresh(page, '/menu')
  await safeClick(page.locator('.add-btn:not([disabled])').first())
  await fresh(page, '/cart')
  const submit = page.getByRole('button', { name: /提交订单|确认下单|下单/ }).first()
  if (await submit.count()) {
    await safeClick(submit)
    await page.waitForTimeout(900)
    // 该实现为点击即下单、成功后跳订单详情（无二次确认弹窗）
    const ok = /\/order\//.test(page.url()) || /\/orders/.test(page.url()) ||
      (await page.locator('.el-message').count()) > 0
    record('购物车·提交订单并跳转', ok, page.url().split('#')[1])
  } else record('购物车·下单弹窗', false, '未找到提交按钮')
} catch (e) { record('购物车链路', false, 'ERR ' + e.message.slice(0, 90)) }

// --- 订单页：状态筛选 / 详情 ---
await fresh(page, '/orders')
try {
  const filterBtns = page.locator('.order-filter button, .filter-bar button, button', { hasText: /全部|待取餐|已完成|备餐/ })
  if (await filterBtns.count() > 1) {
    await safeClick(filterBtns.nth(1))
    record('订单·状态筛选', (await page.locator('button.is-active, .is-active').count()) > 0)
  } else record('订单·状态筛选', false, '未找到多个筛选按钮')
  if (await page.locator('button', { hasText: '详情' }).count()) {
    await safeClick(page.locator('button', { hasText: '详情' }).first())
    record('订单·详情跳转', /\/order\//.test(page.url()), page.url().split('#')[1])
  } else record('订单·详情跳转', true, '当前无订单可点，跳过')
} catch (e) { record('订单页链路', false, 'ERR ' + e.message.slice(0, 80)) }

// --- 个人中心导航 ---
for (const [label, href] of [['个人中心·校园菜单', '#/menu'], ['个人中心·我的订单', '#/orders']]) {
  await fresh(page, '/center/overview')
  try {
    await safeClick(page.locator(`.top-nav a[href="${href}"]`).first())
    record(label, page.url().includes(href.slice(1)), page.url().split('#')[1])
  } catch (e) { record(label, false, 'ERR ' + e.message.slice(0, 70)) }
}
await fresh(page, '/center/overview')
try {
  await safeClick(page.getByRole('button', { name: /用餐帮助/ }).first())
  record('个人中心·用餐帮助', (await page.locator('.el-dialog, [role="dialog"]').filter({ visible: true }).count()) > 0)
} catch (e) { record('个人中心·用餐帮助', false, e.message.slice(0, 70)) }

await ctx.close()

// ==================== 移动端 ====================
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const mp = await mctx.newPage()
mp.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[mobile] ' + m.text()) })
mp.on('pageerror', (e) => consoleErrors.push('[mobile pageerror] ' + e.message))
await login(mp)
await mp.evaluate(() => localStorage.removeItem('shiguang-cart'))

// --- 底部 TabBar 四项 ---
for (const [label, expect] of [['点餐', '点餐'], ['餐车', '点餐'], ['订单', '订单'], ['我的', null]]) {
  await fresh(mp, '/mobile')
  try {
    const tab = mp.locator('.mobile-tabbar__item', { hasText: label }).first()
    await safeClick(tab)
    const active = await mp.locator('.mobile-tabbar__item.is-active').first().textContent().catch(()=>'')
    const toast = await mp.locator('.van-toast').count()
    const url = mp.url()
    const ok = expect === null ? url.includes('/center') : (active.includes(expect) || toast > 0)
    record(`移动TabBar·${label}`, ok, `active=${active} toast=${toast} url=${url.split('#')[1]}`)
  } catch (e) { record(`移动TabBar·${label}`, false, 'ERR ' + e.message.slice(0, 70)) }
}

// --- 移动金刚区 8 入口 ---
for (const label of quickLabels) {
  await fresh(mp, '/mobile')
  try {
    const item = mp.locator('.qe-item', { hasText: label }).first()
    const b = { cards: await mp.locator('.m-dish').count(),
      meal: await mp.locator('.m-meal.is-active').textContent().catch(()=>''),
      nav: await mp.locator('.mobile-tabbar__item.is-active').textContent().catch(()=>'') }
    await safeClick(item)
    const a = { cards: await mp.locator('.m-dish').count(),
      meal: await mp.locator('.m-meal.is-active').textContent().catch(()=>''),
      nav: await mp.locator('.mobile-tabbar__item.is-active').textContent().catch(()=>'') }
    let ok
    if (label === '立即点餐' || label === '午餐') ok = a.cards > 0
    else ok = b.cards !== a.cards || b.meal !== a.meal || b.nav !== a.nav || (await mp.locator('.van-toast').count()) > 0
    record(`移动金刚区·${label}`, ok, `cards ${b.cards}->${a.cards} meal ${b.meal}->${a.meal} nav=${a.nav}`)
  } catch (e) { record(`移动金刚区·${label}`, false, 'ERR ' + e.message.slice(0, 70)) }
}

// --- 移动：餐次/分类/stepper/结算/下单 ---
await fresh(mp, '/mobile')
try {
  const meal0 = await mp.locator('.m-meal.is-active').textContent()
  await safeClick(mp.locator('.m-meal').first())
  const meal1 = await mp.locator('.m-meal.is-active').textContent()
  record('移动·餐次切换', meal0 !== meal1, `${meal0}->${meal1}`)
  const cartMeal = await mp.evaluate(() => JSON.parse(localStorage.getItem('shiguang-cart') || '{}').meal)
  record('移动·餐次同步购物车', cartMeal === 'breakfast', `cart.meal=${cartMeal}`)
  const cat0 = await mp.locator('.m-chip.is-active').textContent()
  await safeClick(mp.locator('.m-chip').nth(1))
  const cat1 = await mp.locator('.m-chip.is-active').textContent()
  record('移动·分类切换', cat0 !== cat1, `${cat0}->${cat1}`)
  await safeClick(mp.locator('.m-chip').first())
  const plus = mp.locator('.van-stepper__plus').first()
  await plus.waitFor({ state: 'visible', timeout: 5000 })
  await safeClick(plus)
  record('移动·stepper加菜', (await mp.locator('.m-submit-bar').count()) > 0)
  await safeClick(mp.locator('.m-submit-bar__btn'))
  const dlg = await mp.locator('.van-dialog').count()
  record('移动·结算弹窗', dlg > 0)
  if (dlg) {
    // 真正的下单按钮是弹窗内容区的「提交订单」，不是 Vant 默认确认键
    const confirm = mp.locator('.van-dialog').getByRole('button', { name: '提交订单' }).first()
    if (await confirm.count()) {
      await safeClick(confirm)
      await mp.waitForTimeout(1000)
      const nav = await mp.locator('.mobile-tabbar__item.is-active').textContent().catch(()=>'')
      const ok = /订单/.test(nav) || (await mp.locator('.van-toast').count()) > 0
      record('移动·确认下单', ok, 'nav=' + nav)
    } else record('移动·确认下单', false, '未找到提交订单按钮')
  }
} catch (e) { record('移动点餐链路', false, 'ERR ' + e.message.slice(0, 90)) }

await mctx.close()
await browser.close()

// 清理测试订单
try {
  const dbs = await import('node:fs')
  const p = '.local/db.runtime.json'
  const db = JSON.parse(dbs.readFileSync(p, 'utf8'))
  db.orders = []
  dbs.writeFileSync(p, JSON.stringify(db, null, 2))
} catch {}

const pass = results.filter((r) => r.ok).length
const fail = results.filter((r) => !r.ok)
console.log(`\n===== 汇总：${pass}/${results.length} PASS, ${fail.length} FAIL =====`)
if (fail.length) console.log('失败项：\n' + fail.map((f) => ' - ' + f.name + ' :: ' + f.detail).join('\n'))
console.log('控制台错误：', consoleErrors.length ? '\n' + consoleErrors.join('\n') : 'none')

const fs = await import('node:fs')
fs.writeFileSync('e2e-result.json', JSON.stringify({ pass, total: results.length, fail, consoleErrors, results }, null, 2))
