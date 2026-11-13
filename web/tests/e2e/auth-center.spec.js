import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const shots = path.resolve('../screenshots')
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
  await page.waitForTimeout(800)
}

test('登录页可用、校验空输入与错误密码，桌面视觉留档', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/login')
  await readyForScreenshot(page)
  await page.screenshot({ path: path.join(shots, 'G5-01-登录-桌面.png'), fullPage: true })
  await page.getByRole('button', { name: '登录食光校园' }).click()
  await expect(page.getByText('请输入学号', { exact: true })).toBeVisible()
  await page.getByLabel('学号', { exact: true }).fill('32605150621')
  await page.getByLabel('密码', { exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: '登录食光校园' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: '账号、密码或登录身份不正确' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
  expect(errors).toEqual([])
})
test('未登录拦截，登录后返回原来的嵌套页面', async ({ page }) => {
  await page.goto('/#/center/profile')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await page.getByTestId('demo-student').click()
  await expect(page).toHaveURL(/\/center\/profile$/)
  await expect(page.getByRole('heading', { name: '每一面，都是你。' })).toBeVisible()
})
test('登录状态刷新恢复、嵌套路由可切换，个人中心视觉留档', async ({ page }) => {
  await demoLogin(page)
  await page.reload()
  await expect(page.getByTestId('account-summary')).toBeVisible()
  await readyForScreenshot(page)
  await page.screenshot({ path: path.join(shots, 'G5-02-个人中心-桌面.png'), fullPage: true })
  await page.getByRole('menuitem', { name: '账号安全' }).click()
  await expect(page).toHaveURL(/\/center\/security$/)
  await expect(page.getByRole('heading', { name: '安心，才有好食光。' })).toBeVisible()
})
test('个人资料实际保存并可在刷新后读回', async ({ page }) => {
  await demoLogin(page)
  await page.getByRole('menuitem', { name: '个人资料' }).click()
  const nickname = page.getByLabel('昵称', { exact: true })
  await expect(nickname).toBeVisible()
  const original = await nickname.inputValue()
  await nickname.fill('食光测试同学')
  await page.getByRole('button', { name: '保存个人资料', exact: true }).click()
  await expect(page.getByText('个人资料已保存', { exact: true })).toBeVisible()
  await page.reload()
  await expect(nickname).toHaveValue('食光测试同学')
  await nickname.fill(original)
  await page.getByRole('button', { name: '保存个人资料', exact: true }).click()
  await expect(page.getByText('个人资料已保存', { exact: true })).toBeVisible()
  await readyForScreenshot(page)
  await page.screenshot({ path: path.join(shots, 'G5-03-个人资料-桌面.png'), fullPage: true })
})
test('用餐偏好保存回读，未保存离开会确认', async ({ page }) => {
  await demoLogin(page)
  await page.getByRole('menuitem', { name: '用餐偏好' }).click()
  await page.getByRole('button', { name: '中辣 恰到好处' }).click()
  await page.getByRole('button', { name: '保存用餐偏好', exact: true }).click()
  await expect(page.getByText('用餐偏好已保存', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: '中辣 恰到好处' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: '微辣 一点点就好' }).click()
  await page.getByRole('menuitem', { name: '食光概览' }).click()
  await expect(page.getByRole('dialog')).toContainText('用餐偏好还未保存')
  await page.getByRole('button', { name: '继续编辑', exact: true }).click()
  await page.getByRole('button', { name: '保存用餐偏好', exact: true }).click()
  await expect(page.getByText('用餐偏好已保存', { exact: true })).toBeVisible()
})
test('学生越权访问被拦截，伪造会话不能从持久化恢复', async ({ page }) => {
  await demoLogin(page)
  await page.goto('/#/admin/dishes')
  await expect(page).toHaveURL(/\/forbidden$/)
  await expect(page.getByRole('heading', { name: '这个页面属于档口商家' })).toBeVisible()
  await page.evaluate(() => {
    const key = 'shiguang.user.v1'
    const item = JSON.parse(sessionStorage.getItem(key))
    item.token = 'f'.repeat(64)
    sessionStorage.setItem(key, JSON.stringify(item))
  })
  await page.goto('/#/center/overview')
  await page.reload()
  await expect(page).toHaveURL(/\/login/)
})
test('商家可进入商家入口，退出后后退不能进入受保护页面', async ({ page }) => {
  await demoLogin(page, 'merchant')
  await page.goto('/#/admin/dishes')
  await expect(page.getByRole('heading', { name: '欢迎来到档口工作台' })).toBeVisible()
  await page.getByRole('button', { name: '回到个人中心' }).click()
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await page
    .locator('.el-message-box')
    .getByRole('button', { name: '退出登录', exact: true })
    .click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/#/center/security')
  await expect(page).toHaveURL(/\/login\?redirect=/)
})
test('外部 redirect 不会跳出本站，API 断开时清楚报错', async ({ page }) => {
  await page.goto('/#/login?redirect=https://example.com')
  await page.getByTestId('demo-student').click()
  await expect(page).toHaveURL(/\/center\/overview$/)
  await page.evaluate(() => {
    sessionStorage.clear()
    localStorage.clear()
  })
  await page.goto('/#/login')
  await page.reload()
  await page.route('**/api/auth/login', (route) => route.abort())
  await page.getByTestId('demo-student').click()
  await expect(page.getByRole('alert')).toContainText('暂时无法连接食堂服务')
})
test('本地有效期到达后立即拦截，不依赖缓存的登录态 getter', async ({ page }) => {
  await page.clock.install({ time: new Date() })
  await demoLogin(page)
  const expiresAt = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('shiguang.user.v1')).expiresAt,
  )
  await page.clock.setFixedTime(new Date(expiresAt + 1))
  await page.getByRole('menuitem', { name: '账号安全' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem('shiguang.user.v1') || '{}').token || '',
    ),
  ).toBe('')
})
test('移动端 375px、平板 768px 无横向溢出，减少动效可正常登录', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/#/login')
  await readyForScreenshot(page)
  await page.screenshot({ path: path.join(shots, 'G5-04-登录-手机.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByTestId('demo-student').click()
  await expect(page.getByTestId('account-summary')).toBeVisible()
  await readyForScreenshot(page)
  await page.screenshot({ path: path.join(shots, 'G5-05-个人中心-手机.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 768, height: 1024 })
  await expect(page.getByRole('heading', { name: /王鸿/, level: 1 })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
