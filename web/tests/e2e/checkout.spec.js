import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'

const shots = path.resolve(process.env.SCREENSHOT_DIR || '.local/screenshots')
fs.mkdirSync(shots, { recursive: true })
async function signIn(page, role, target) {
  await page.goto(`/#/login?redirect=${encodeURIComponent(target)}`)
  await page.getByTestId(`demo-${role}`).click()
  await expect(page).toHaveURL(new RegExp(target + '$'))
}
async function scan(page) {
  await expect(page.locator('.el-message, .van-toast:visible')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(
    result.violations.map((v) => [v.id, v.nodes.map((n) => [n.target, n.failureSummary])]),
  ).toEqual([])
}
test('两档口分别结算，商家通知取餐后学生评价，未结档口可以清空', async ({ page, browser }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await signIn(page, 'student', '/menu')
  await page.getByRole('button', { name: '将招牌红烧肉饭加入餐车' }).click()
  await page.getByRole('button', { name: '将元气藜麦轻食碗加入餐车' }).click()
  await page.goto('/#/cart')
  await page.getByRole('radio', { name: /青禾小厨/ }).check()
  await expect(page.getByRole('button', { name: /提交订单/ })).toContainText('18.00')
  await scan(page)
  await page.screenshot({ path: path.join(shots, 'G5-20-按档口结算.png') })
  await page.getByRole('button', { name: /提交订单/ }).click()
  await expect(page).toHaveURL(/#\/order\/SG/)
  const id = page.url().split('/').pop()
  await expect(page.getByRole('heading', { name: '备餐中' })).toBeVisible()
  const merchantContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const merchant = await merchantContext.newPage()
  try {
    await signIn(merchant, 'merchant', '/orders')
    const own = merchant.locator('.order-row').filter({ hasText: id })
    await own.getByRole('button', { name: '通知取餐' }).click()
    await expect(own.locator('.order-row__status')).toHaveText('待取餐')
    await merchant.goto('/#/admin/overview')
    await expect(merchant.getByTestId('dash-metric-orders')).toBeVisible()
    await scan(merchant)
    await merchant.screenshot({ path: path.join(shots, 'G5-21-档口经营.png') })
  } finally {
    await merchantContext.close()
  }
  await page.goto('/#/center/overview')
  const ready = page
    .getByTestId('account-summary')
    .locator('small')
    .filter({ hasText: '待取餐' })
    .locator('..')
  await expect(ready).not.toContainText('0笔')
  await page.goto(`/#/order/${id}`)
  await page.getByRole('button', { name: '我已取餐' }).click()
  await page.getByRole('button', { name: '招牌红烧肉饭 5 星' }).click()
  await expect(page.getByText('已评 5 星')).toBeVisible()
  await page.reload()
  await expect(page.getByText('已评 5 星')).toBeVisible()
  await scan(page)
  await page.screenshot({ path: path.join(shots, 'G5-22-取餐后评价.png') })
  await page.goto('/#/cart')
  await expect(page.locator('.cart-line')).toHaveCount(1)
  await expect(page.locator('.cart-line')).toContainText('元气藜麦轻食碗')
  await page.getByRole('button', { name: '清空餐车' }).click()
  await page.getByRole('button', { name: '确认清空' }).click()
  await expect(page.getByRole('heading', { name: '餐车还是空的' })).toBeVisible()
  expect(errors).toEqual([])
})

test('375px 手机可取消弹窗、选档口、提交、刷新读回，其他档口操作只读', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await signIn(page, 'student', '/mobile')
  const card = (name) =>
    page.locator('.m-dish').filter({ has: page.getByRole('heading', { name, exact: true }) })
  await card('招牌红烧肉饭').locator('.van-stepper__plus').click()
  await card('元气藜麦轻食碗').locator('.van-stepper__plus').click()
  await page.getByRole('button', { name: '去结算' }).click()
  const dialog = page.getByRole('dialog', { name: '确认订单' })
  await dialog.getByRole('button', { name: '继续选菜' }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: '去结算' }).click()
  await dialog.getByRole('radio', { name: /轻食|绿野/ }).check()
  await scan(page)
  await page.screenshot({ path: path.join(shots, 'G5-23-手机分档口结算.png') })
  await dialog.getByRole('button', { name: '提交订单' }).click()
  await expect(page.locator('.m-order').first()).toContainText('元气藜麦轻食碗')
  const id = (await page.locator('.m-order').first().locator('.m-order__head').innerText()).match(
    /SG\w+/,
  )[0]
  await page.reload()
  await page.getByRole('button', { name: '订单', exact: true }).click()
  await expect(page.locator('.m-order').first()).toContainText(id)
  await page.getByRole('button', { name: '点餐', exact: true }).click()
  await scan(page)
  await page.screenshot({ path: path.join(shots, 'G5-24-手机菜单.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '去结算' }).click()
  await dialog.getByRole('button', { name: '清空餐车' }).click()
  await page.getByRole('button', { name: '确认清空' }).click()
  await expect(page.getByRole('button', { name: '去结算' })).toHaveCount(0)
  const merchantContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' })
  const merchant = await merchantContext.newPage()
  try {
    await signIn(merchant, 'merchant', '/orders')
    const row = merchant.locator('.order-row').filter({ hasText: id })
    await expect(row).toBeVisible()
    await expect(row.getByRole('button', { name: '通知取餐' })).toHaveCount(0)
    await merchant.goto('/#/cart')
    await expect(merchant).toHaveURL(/forbidden/)
  } finally {
    await merchantContext.close()
  }
})
