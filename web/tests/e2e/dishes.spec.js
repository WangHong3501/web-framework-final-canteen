import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import path from 'node:path'
import fs from 'node:fs'

const shots = path.resolve(process.env.SCREENSHOT_DIR || '.local/screenshots')
fs.mkdirSync(shots, { recursive: true })
const { dishes: seedDishes } = JSON.parse(
  fs.readFileSync(new URL('../../db.json', import.meta.url), 'utf8'),
)
const merchantDishCount = seedDishes.filter((dish) => dish.stallId === 'stall-1').length

async function demoLogin(page, role = 'student') {
  await page.goto('/#/login')
  await page.getByTestId(`demo-${role}`).click()
  await expect(page).toHaveURL(role === 'merchant' ? /\/orders$/ : /\/menu$/)
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

test('校园菜单优惠优先、价格对齐，筛选后仍可加餐车或查看详情', async ({ page }) => {
  await demoLogin(page, 'student')
  await expect(page.getByTestId('menu-dish-grid')).toBeVisible()
  await expect(page.locator('.food-card')).toHaveCount(seedDishes.length)
  const offers = seedDishes.filter(
    (dish) => dish.originalPrice > dish.price && dish.status !== 'danger',
  )
  await expect(page.locator('.food-card').first()).toContainText(offers[0].name)
  const onlyOffers = page.getByRole('button', { name: '仅看优惠', exact: true })
  await onlyOffers.click()
  await expect(page.locator('.food-card')).toHaveCount(offers.length)
  await expect(onlyOffers).toHaveAttribute('aria-pressed', 'true')
  await onlyOffers.click()
  await expect(page.locator('.food-card')).toHaveCount(seedDishes.length)
  await expect(page.getByRole('button', { name: '将糖醋里脊加入餐车' })).toBeDisabled()

  await page.getByRole('tab', { name: /青禾小厨/ }).click()
  await expect(page.locator('.food-card')).toHaveCount(merchantDishCount)
  const priceBaselines = await page
    .locator('.food-card .price-tag__amount')
    .evaluateAll((prices) =>
      prices.slice(0, 3).map((price) => Math.round(price.getBoundingClientRect().bottom)),
    )
  expect(new Set(priceBaselines).size).toBe(1)
  await page.getByRole('tab', { name: '全部档口', exact: true }).click()

  await readyForScreenshot(page)
  await assertAccessible(page, 'menu')
  await page.screenshot({ path: path.join(shots, 'G5-15-菜单档口切换-桌面.png') })

  const cuisine = page.getByLabel('菜系', { exact: true })
  await cuisine.selectOption('闽菜')
  await expect(page.locator('.food-card')).toHaveCount(
    seedDishes.filter((dish) => dish.cuisine === '闽菜').length,
  )
  await page.getByRole('link', { name: '查看福州荔枝肉详情' }).click()
  await expect(page.getByRole('heading', { name: '福州荔枝肉' })).toBeVisible()
  await page.getByRole('link', { name: '返回菜单', exact: true }).click()
  await expect(cuisine).toHaveValue('闽菜')
  await cuisine.selectOption('全部')

  await page.getByRole('tab', { name: /麦香面馆/ }).click()
  await expect(page.locator('.food-card')).toHaveCount(
    seedDishes.filter((dish) => dish.stallId === 'stall-2').length,
  )

  await page.getByRole('tab', { name: '全部档口', exact: true }).click()
  await page.getByRole('tab', { name: '早餐', exact: true }).click()
  await expect(page.locator('.food-card')).toHaveCount(
    seedDishes.filter((dish) => dish.meal === 'breakfast').length,
  )

  await page.getByRole('tab', { name: '全部餐次', exact: true }).click()
  await page.getByLabel('菜品分类').selectOption('家常小炒')
  await page.getByLabel('搜索菜名、档口或描述').fill('红烧肉')
  await expect(page.locator('.food-card')).toHaveCount(1)
  await expect(page.getByTestId('menu-dish-dish-01')).toBeVisible()
  await page.getByRole('link', { name: '查看招牌红烧肉饭详情' }).click()
  await expect(page).toHaveURL(/\/dish\/dish-01\?/)
  await expect(page.getByRole('link', { name: '点餐', exact: true })).toHaveAttribute(
    'aria-current',
    'location',
  )
  await page.getByRole('link', { name: '返回菜单', exact: true }).click()
  await expect(page.getByLabel('搜索菜名、档口或描述')).toHaveValue('红烧肉')
  await expect(page.getByLabel('菜品分类')).toHaveValue('家常小炒')
  await expect(page.locator('.food-card')).toHaveCount(1)

  await page.getByLabel('搜索菜名、档口或描述').fill('不存在的测试菜品')
  await expect(page.getByRole('heading', { name: '换个条件试试看' })).toBeVisible()
  await page.getByRole('button', { name: '重置筛选' }).click()
  await expect(page.locator('.food-card')).toHaveCount(seedDishes.length)

  await page.getByRole('button', { name: '将招牌红烧肉饭加入餐车' }).click()
  await expect(page.getByTestId('menu-cart-bar')).toContainText('已选 1 件')
  await page.reload()
  await expect(page.getByTestId('menu-cart-bar')).toContainText('已选 1 件')
})

test('菜品详情动态路由可正常加载、加车与切换推荐，非法参数给出友好反馈', async ({ page }) => {
  await demoLogin(page, 'student')
  await page.getByRole('link', { name: '查看招牌红烧肉饭详情' }).click()
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
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '菜品管理' })
    .click()
  await expect(page.getByRole('heading', { name: '欢迎来到档口工作台' })).toBeVisible()
  await expect(page.getByTestId('metric-total')).toHaveText(String(merchantDishCount))

  await readyForScreenshot(page)
  await assertAccessible(page, 'admin-dishes')
  await page.screenshot({ path: path.join(shots, 'G5-17-档口菜品管理-桌面.png'), fullPage: true })

  await page.getByRole('link', { name: '招牌红烧肉饭', exact: true }).click()
  await expect(page.getByRole('heading', { name: '招牌红烧肉饭' })).toBeVisible()
  await expect(page.getByRole('link', { name: '菜品管理', exact: true })).toHaveAttribute(
    'aria-current',
    'location',
  )
  await page.getByRole('link', { name: '返回菜品管理', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/dishes$/)

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
  await expect(page.getByTestId('metric-total')).toHaveText(String(merchantDishCount + 1))
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
  await expect(page.getByTestId('metric-total')).toHaveText(String(merchantDishCount))
  await expect(page.locator('tr', { hasText: '清炒时蔬套餐' })).toHaveCount(0)
})

test('移动端 375px 下菜单页与详情页无横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await demoLogin(page, 'student')
  await expect(page.locator('.m-dish')).toHaveCount(seedDishes.length)
  await readyForScreenshot(page)
  await page.screenshot({ path: path.join(shots, 'G5-19-菜单详情-手机.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  const stalls = page.getByRole('combobox', { name: '食堂档口' })
  await stalls.selectOption({ label: '青禾小厨' })
  await expect(page.locator('.m-dish')).toHaveCount(merchantDishCount)
  const cuisine = page.getByLabel('菜系', { exact: true })
  await cuisine.selectOption('粤菜')
  const cantoneseDishes = seedDishes.filter(
    (dish) => dish.stallId === 'stall-1' && dish.cuisine === '粤菜',
  )
  await expect(page.locator('.m-dish')).toHaveCount(cantoneseDishes.length)
  await page.getByRole('link', { name: '查看香菇滑鸡饭详情' }).click()
  await expect(page.getByRole('heading', { name: '香菇滑鸡饭' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('link', { name: '返回菜单', exact: true }).click()
  await expect(page.locator('.m-dish')).toHaveCount(cantoneseDishes.length)
  await expect(stalls.locator('option:checked')).toHaveText('青禾小厨')
  await expect(cuisine).toHaveValue('粤菜')
})
