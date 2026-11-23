import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import path from 'node:path'
import fs from 'node:fs'

const shots = path.resolve(process.env.SCREENSHOT_DIR || '.local/screenshots')
fs.mkdirSync(shots, { recursive: true })

async function demoLogin(page, role = 'student') {
  await page.goto('/#/login')
  await page.getByTestId(`demo-${role}`).click()
  await expect(page).toHaveURL(/\/center\/overview$/)
  await expect(page.getByTestId('account-summary')).toBeVisible()
}

async function readyForScreenshot(page) {
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.el-message')).toHaveCount(0)
  await page.waitForTimeout(700)
}

async function assertAccessible(page, label) {
  await page.evaluate(() => document.fonts.ready)
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(
    result.violations,
    `${label} 检测到无障碍违规：${JSON.stringify(result.violations, null, 2)}`,
  ).toEqual([])
}

test('校园菜单支持档口 Tab、餐次、分类、搜索与真实点餐车联动', async ({ page }) => {
  await demoLogin(page, 'student')
  await page.goto('/#/menu')
  await expect(page.getByTestId('menu-dish-grid')).toBeVisible()
  await expect(page.locator('.food-card')).toHaveCount(12)
  await expect(page.getByRole('button', { name: '将糖醋里脊加入餐车' })).toBeDisabled()

  await readyForScreenshot(page)
  await assertAccessible(page, 'menu')
  await page.screenshot({ path: path.join(shots, 'G5-15-菜单档口切换-桌面.png'), fullPage: true })

  await page.getByRole('tab', { name: /麦香面馆/ }).click()
  await expect(page.locator('.food-card')).toHaveCount(3)

  await page.getByRole('tab', { name: '全部档口', exact: true }).click()
  await page.getByRole('tab', { name: '早餐', exact: true }).click()
  await expect(page.locator('.food-card')).toHaveCount(3)

  await page.getByRole('tab', { name: '全部餐次', exact: true }).click()
  await page.getByRole('tab', { name: '家常小炒', exact: true }).click()
  await page.getByLabel('搜索菜名、档口或描述').fill('红烧肉')
  await expect(page.locator('.food-card')).toHaveCount(1)
  await expect(page.getByTestId('menu-dish-dish-01')).toBeVisible()

  await page.getByLabel('搜索菜名、档口或描述').fill('不存在的测试菜品')
  await expect(page.getByRole('heading', { name: '换个条件试试看' })).toBeVisible()
  await page.getByRole('button', { name: '重置筛选' }).click()
  await expect(page.locator('.food-card')).toHaveCount(12)

  await page.getByRole('button', { name: '将招牌红烧肉饭加入餐车' }).click()
  await expect(page.getByTestId('menu-cart-bar')).toContainText('已选 1 件')
  await page.reload()
  await expect(page.getByTestId('menu-cart-bar')).toContainText('已选 1 件')
})

test('菜品详情动态路由可正常加载、加车与切换推荐，非法参数给出友好反馈', async ({ page }) => {
  await demoLogin(page, 'student')
  await page.goto('/#/menu')
  await page.getByRole('button', { name: '查看招牌红烧肉饭详情' }).click()
  await expect(page).toHaveURL(/\/dish\/dish-01$/)
  await expect(page.getByRole('heading', { name: '招牌红烧肉饭' })).toBeVisible()
  await expect(page.getByTestId('detail-subtotal')).toContainText('¥18.00')

  await readyForScreenshot(page)
  await assertAccessible(page, 'dish-detail')
  await page.screenshot({ path: path.join(shots, 'G5-16-菜品详情-桌面.png'), fullPage: true })

  await page.getByRole('button', { name: '增加份数' }).click()
  await expect(page.getByTestId('detail-qty')).toHaveText('2')
  await expect(page.getByTestId('detail-subtotal')).toContainText('¥36.00')
  await page.getByTestId('detail-add-btn').click()
  await expect(page.getByTestId('detail-cart-hint')).toContainText('已有 2 份')

  await page.getByRole('button', { name: /香煎鸡腿饭/ }).click()
  await expect(page).toHaveURL(/\/dish\/dish-02$/)
  await expect(page.getByRole('heading', { name: '香煎鸡腿饭' })).toBeVisible()

  await page.goto('/#/dish/bad!id')
  await expect(page.getByRole('heading', { name: /菜品编号格式不正确/ })).toBeVisible()

  await page.goto('/#/dish/dish-999')
  await expect(page.getByRole('heading', { name: /未找到这个菜品/ })).toBeVisible()
})

test('档口商家工作台支持只看本档口、上下架 PUT 与 Dialog 增删改回读', async ({ page }) => {
  await demoLogin(page, 'merchant')
  await page.goto('/#/admin/dishes')
  await expect(page.getByRole('heading', { name: '欢迎来到档口工作台' })).toBeVisible()
  await expect(page.getByTestId('metric-total')).toHaveText('5')

  await readyForScreenshot(page)
  await assertAccessible(page, 'admin-dishes')
  await page.screenshot({ path: path.join(shots, 'G5-17-档口菜品管理-桌面.png'), fullPage: true })

  const soldDish = page.locator('tr', { hasText: '糖醋里脊' })
  await soldDish.getByRole('button', { name: '下架' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click()
  await expect(page.getByText('「糖醋里脊」已下架')).toBeVisible()
  await page.reload()
  await expect(soldDish).toContainText('已下架')
  await expect(page.getByTestId('metric-danger')).toHaveText('0')
  await soldDish.getByRole('button', { name: '上架' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click()
  await expect(page.getByText('「糖醋里脊」已上架')).toBeVisible()
  await expect(soldDish).toContainText('已售罄')
  await expect(page.getByTestId('metric-danger')).toHaveText('1')
  await expect(page.locator('.el-message')).toHaveCount(0)

  await page.getByTestId('add-dish-btn').click()
  const dialog = page.getByRole('dialog', { name: '新增档口菜品' })
  await expect(dialog).toBeVisible()
  await dialog.getByTestId('save-dish-btn').click()
  await expect(dialog.getByText('请填写菜品名称')).toBeVisible()

  await dialog.getByLabel('菜品名称').fill('清炒时蔬套餐')
  await dialog.getByLabel('当前售价（元）').fill('13.50')
  await dialog.getByLabel('菜品简介').fill('每日时令青菜配米饭，少油清淡。')
  await dialog.getByLabel('菜品简介').blur()
  await page.waitForTimeout(400)
  await assertAccessible(page, 'admin-dishes-dialog')
  await page.screenshot({ path: path.join(shots, 'G5-18-菜品弹窗增删改-桌面.png'), fullPage: true })

  await dialog.getByTestId('save-dish-btn').click()
  await expect(page.getByText('菜品已新增')).toBeVisible()
  await expect(page.getByTestId('metric-total')).toHaveText('6')
  await page.reload()
  const createdRow = page.locator('tr', { hasText: '清炒时蔬套餐' })
  await expect(createdRow).toBeVisible()

  await createdRow.getByRole('button', { name: '编辑' }).click()
  const editDialog = page.getByRole('dialog', { name: '编辑档口菜品' })
  await editDialog.getByLabel('当前售价（元）').fill('14.80')
  await editDialog.getByTestId('save-dish-btn').click()
  await expect(page.getByText('菜品已更新')).toBeVisible()
  await page.reload()
  await expect(page.locator('tr', { hasText: '清炒时蔬套餐' })).toContainText('14')
  await expect(page.locator('tr', { hasText: '清炒时蔬套餐' })).toContainText('.80')

  await page
    .locator('tr', { hasText: '清炒时蔬套餐' })
    .getByRole('button', { name: '删除' })
    .click()
  await page.locator('.el-message-box').getByRole('button', { name: '确认删除' }).click()
  await expect(page.getByText('菜品已删除')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('metric-total')).toHaveText('5')
  await expect(page.locator('tr', { hasText: '清炒时蔬套餐' })).toHaveCount(0)
})

test('移动端 375px 下菜单页与详情页无横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await demoLogin(page, 'student')
  await page.goto('/#/menu')
  await expect(page.getByTestId('menu-dish-grid')).toBeVisible()
  await readyForScreenshot(page)
  await page.screenshot({ path: path.join(shots, 'G5-19-菜单详情-手机.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  await page.goto('/#/dish/dish-01')
  await expect(page.getByRole('heading', { name: '招牌红烧肉饭' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
