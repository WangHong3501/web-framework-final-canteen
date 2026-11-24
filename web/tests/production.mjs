import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { once } from 'node:events'
import { chromium, expect } from '@playwright/test'
import production from '../server/serve.cjs'

const { dishes: seedDishes } = JSON.parse(
  fs.readFileSync(new URL('../db.json', import.meta.url), 'utf8'),
)
const dir = path.resolve('.local')
fs.mkdirSync(dir, { recursive: true })
const data = fs.mkdtempSync(path.join(dir, 'production-'))
const output = path.resolve(process.env.SCREENSHOT_DIR || '.local/screenshots')
fs.mkdirSync(output, { recursive: true })
async function capture(page, filename) {
  await expect(page.locator('.el-message, .van-toast:visible')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(output, filename) })
}

const server = production
  .createProductionApp({ dbFile: path.join(data, 'db.runtime.json') })
  .listen(0, '127.0.0.1')
let browser
try {
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  assert.equal((await fetch(base + '/api/health')).status, 200)
  assert.equal((await fetch(base + '/api/dishes')).status, 401)
  assert.equal((await fetch(base + '/.local/db.runtime.json')).status, 404)
  browser = await chromium.launch({ channel: process.platform === 'win32' ? 'chrome' : undefined })
  const errors = []
  const requestErrors = []
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (r) => {
    if (r.status() >= 400) requestErrors.push([r.status(), new URL(r.url()).pathname])
  })
  await page.goto(base + '/#/login?redirect=/menu')
  await page.getByTestId('demo-student').click()
  await expect(page.locator('.food-card')).toHaveCount(seedDishes.length)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      [...document.querySelectorAll('.food-card img')].map(async (img) => {
        img.loading = 'eager'
        await img.decode()
      }),
    )
  })
  assert.equal(
    await page
      .locator('.food-card img')
      .evaluateAll((imgs) => new Set(imgs.map((img) => img.currentSrc)).size),
    seedDishes.length,
  )
  const cuisine = page.getByLabel('菜系', { exact: true })
  await page.getByRole('tab', { name: /青禾小厨/ }).click()
  await expect(page.locator('.food-card').first()).toContainText('招牌红烧肉饭')
  await capture(page, 'G5-08-菜单-桌面.png')
  await page.getByRole('tab', { name: '全部档口', exact: true }).click()
  await cuisine.selectOption('闽菜')
  await expect(page.getByRole('heading', { name: '福州荔枝肉' })).toBeVisible()
  await cuisine.selectOption('川菜')
  await page.getByRole('button', { name: '将川味回锅肉加入餐车' }).click()
  await page.goto(base + '/#/cart')
  await page.getByRole('button', { name: /提交订单/ }).click()
  await expect(page).toHaveURL(/#\/order\/SG/)
  const orderId = page.url().split('/').pop()
  await page.reload()
  await expect(page.getByRole('heading', { name: '备餐中' })).toBeVisible()
  await page.goto(base + '/#/orders')
  await expect(page.locator('.order-row').first()).toContainText(orderId)
  await capture(page, 'G5-11-订单-桌面.png')
  await page.goto(base + '/#/mobile')
  const phone = page.getByRole('region', { name: '移动端演示' })
  await expect(phone.locator('.m-dish').first()).toBeVisible()
  await capture(page, 'G5-09-移动点餐-预览.png')
  await phone.getByRole('button', { name: '增加招牌红烧肉饭', exact: true }).click()
  await phone.getByRole('button', { name: '去结算', exact: true }).click()
  await expect(page).toHaveURL(/\/cart\?preview=phone$/)
  await expect(phone.getByRole('button', { name: '提交订单', exact: true })).toBeVisible()
  const merchant = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    reducedMotion: 'reduce',
  })
  const workbench = await merchant.newPage()
  workbench.on('pageerror', (err) => errors.push(err.message))
  await workbench.goto(base + '/#/login?redirect=/orders')
  await workbench.getByTestId('demo-merchant').click()
  const row = workbench.locator('.order-row').filter({ hasText: orderId })
  await row.getByRole('button', { name: '通知取餐' }).click()
  await expect(row.locator('.order-row__status')).toHaveText('待取餐')
  await capture(workbench, 'G5-13-订单工作台-管理员.png')
  await page.goto(base + '/#/order/' + orderId)
  await page.getByRole('button', { name: '我已取餐' }).click()
  await page.getByRole('button', { name: '川味回锅肉 4 星' }).click()
  await expect(page.getByText('已评 4 星')).toBeVisible()
  await page.goto(base + '/#/dish/dish-seed-37')
  await expect(page.getByText('4 分 · 1 条评价')).toBeVisible()
  assert.deepEqual(errors, [])
  assert.deepEqual(requestErrors, [])
  console.log(
    `PASS 同源生产服务：静态资源、权限、${seedDishes.length} 张菜单图、菜系筛选、hash 刷新、新菜下单、商家通知、确认取餐、评价回读`,
  )
} finally {
  await browser?.close()
  await new Promise((resolve) => server.close(resolve))
  fs.rmSync(data, { recursive: true, force: true })
}
