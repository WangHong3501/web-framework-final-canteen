import { chromium } from '@playwright/test'

const BASE = 'http://127.0.0.1:5173'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

async function login(page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('请输入你的学号').fill('32605150621')
  await page.getByPlaceholder('请输入登录密码').fill('Shiguang@2026')
  await page.getByRole('button', { name: '登录食光校园' }).click()
  await page.waitForURL((url) => !url.hash.includes('/login'), { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(600)
}

const browser = await chromium.launch({ headless: true, executablePath: EDGE })

async function auditRoute(page, label, hash) {
  await page.goto(`${BASE}/#${hash}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const res = await page.evaluate(() => {
    const de = document.documentElement
    const overflow = de.scrollWidth > de.clientWidth
      ? { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth }
      : null
    const brokenImgs = [...document.querySelectorAll('img')]
      .filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0)
      .map((i) => i.getAttribute('src'))
    const noAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length
    const smallTargets = [...document.querySelectorAll('button, a, [role="button"], input')]
      .map((e) => {
        const r = e.getBoundingClientRect()
        const s = getComputedStyle(e)
        return { tag: e.tagName, text: (e.textContent || e.value || '').trim().slice(0, 12), w: Math.round(r.width), h: Math.round(r.height), vis: s.visibility !== 'hidden' && s.display !== 'none' }
      })
      .filter((e) => e.vis && e.w > 0 && e.h > 0 && (e.h < 36 || e.w < 36))
      .slice(0, 12)
    return { overflow, brokenImgs, noAlt, smallTargets }
  })
  console.log(`\n### ${label} (${hash})`)
  console.log('  横向溢出:', res.overflow ? `YES ${res.overflow.scrollWidth}>${res.overflow.clientWidth}` : 'no')
  console.log('  图片失败:', res.brokenImgs.length ? res.brokenImgs.join(', ') : 'none')
  console.log('  缺alt:', res.noAlt)
  console.log('  小触控目标:', res.smallTargets.length ? JSON.stringify(res.smallTargets) : 'none')
}

const errors = []

// 桌面
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message))
await login(page)
for (const [l, h] of [['菜单', '/menu'], ['购物车', '/cart'], ['订单', '/orders'], ['移动预览', '/mobile']]) {
  await auditRoute(page, '桌面-' + l, h)
}
// 菜品详情（取第一道菜 id）
await page.goto(`${BASE}/#/menu`, { waitUntil: 'networkidle' })
const firstId = await page.evaluate(() => {
  const a = document.querySelector('a[href*="/dish/"]')
  return a ? a.getAttribute('href').split('/dish/')[1] : null
})
if (firstId) await auditRoute(page, '桌面-菜品详情', '/dish/' + firstId)

// 真机
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const mp = await mctx.newPage()
mp.on('console', (m) => { if (m.type() === 'error') errors.push('[m-console] ' + m.text()) })
mp.on('pageerror', (e) => errors.push('[m-pageerror] ' + e.message))
await login(mp)
await auditRoute(mp, '真机-移动点餐', '/mobile')
await auditRoute(mp, '真机-菜单(响应式)', '/menu')

await browser.close()
console.log('\n=== 运行时错误 ===')
console.log(errors.length ? errors.join('\n') : 'none')
