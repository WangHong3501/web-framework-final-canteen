import { chromium } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'http://127.0.0.1:5173'
const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT = path.resolve(WEB_ROOT, '../screenshots')
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

async function login(page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('请输入你的学号').fill('32605150621')
  await page.getByPlaceholder('请输入登录密码').fill('Shiguang@2026')
  await page.getByRole('button', { name: '登录食光校园' }).click()
  await page.waitForURL((url) => !url.hash.includes('/login'), { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(800)
}

const browser = await chromium.launch({ headless: true, executablePath: EDGE })
const errors = []

// 桌面
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()) })
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message))
await login(page)
console.log('after login:', page.url())

await page.goto(`${BASE}/#/menu`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/G5-08-菜单-桌面.png`, fullPage: true })
console.log('shot: 菜单桌面')

await page.goto(`${BASE}/#/mobile`, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/G5-09-移动点餐-预览.png`, fullPage: true })
console.log('shot: 移动点餐预览')

await page.goto(`${BASE}/#/orders`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/G5-11-订单-桌面.png`, fullPage: true })
console.log('shot: 订单桌面')

// 真机窄屏
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
const mp = await mctx.newPage()
mp.on('pageerror', (e) => errors.push('[mobile pageerror] ' + e.message))
await login(mp)
await mp.goto(`${BASE}/#/mobile`, { waitUntil: 'networkidle' })
await mp.waitForTimeout(900)
await mp.screenshot({ path: `${OUT}/G5-10-移动点餐-真机.png`, fullPage: true })
console.log('shot: 移动点餐真机')

await browser.close()
console.log('ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
