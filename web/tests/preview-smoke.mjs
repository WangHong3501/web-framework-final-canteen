import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { once } from 'node:events'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js')
const env = {
  ...process.env,
  API_PORT: '3003',
  DB_FILE: path.join(root, '.local/preview/db.runtime.json'),
}
const children = [
  spawn(process.execPath, ['server/index.cjs'], {
    cwd: root,
    env,
    stdio: 'pipe',
    windowsHide: true,
  }),
  spawn(process.execPath, [vite, 'preview', '--host', '127.0.0.1', '--port', '4175'], {
    cwd: root,
    env,
    stdio: 'pipe',
    windowsHide: true,
  }),
]
for (const child of children) {
  child.stdout.on('data', () => {})
  child.stderr.on('data', (data) => process.stderr.write(data))
}
let browser
const accessibility = []
async function audit(page, label) {
  await page.evaluate(() => document.fonts.ready)
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  accessibility.push({
    page: label,
    violations: result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    })),
  })
  fs.writeFileSync(
    path.join(root, '.local/a11y-report.json'),
    JSON.stringify(accessibility, null, 2),
  )
}
async function waitFor(url) {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* Wait for the owned server. */
    }
    if (children.some((child) => child.exitCode !== null))
      throw new Error('Preview service exited before becoming ready.')
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(`Preview did not become ready: ${url}`)
}
try {
  await Promise.all([waitFor('http://127.0.0.1:3003/health'), waitFor('http://127.0.0.1:4175')])
  browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'chrome' : undefined,
    headless: true,
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  await page.goto('http://127.0.0.1:4175/#/login')
  await audit(page, 'login')
  await page.screenshot({
    path: path.resolve(root, '../screenshots/G5-01-登录-桌面.png'),
    fullPage: true,
  })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({
    path: path.resolve(root, '../screenshots/G5-04-登录-手机.png'),
    fullPage: true,
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByText('在此设备上保持登录', { exact: true }).click()
  await expect(page.getByRole('checkbox', { name: '在此设备上保持登录' })).toBeChecked()
  await page.getByTestId('demo-student').click()
  await expect(page.getByTestId('account-summary')).toBeVisible()
  await expect(page.locator('.el-message')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  await audit(page, 'overview')
  const persistence = await page.evaluate(() => ({
    local: !!localStorage.getItem('shiguang.user.v1'),
    session: !!sessionStorage.getItem('shiguang.user.v1'),
  }))
  if (!persistence.local || persistence.session)
    throw new Error('Remember-login persistence did not use local storage exclusively.')
  await page.screenshot({
    path: path.resolve(root, '../screenshots/G5-02-个人中心-桌面.png'),
    fullPage: true,
  })
  const otherPage = await context.newPage()
  await otherPage.goto('http://127.0.0.1:4175/#/center/profile')
  await expect(otherPage.getByLabel('昵称', { exact: true })).toHaveValue('王鸿')
  await audit(otherPage, 'profile')
  await otherPage.screenshot({
    path: path.resolve(root, '../screenshots/G5-03-个人资料-桌面.png'),
    fullPage: true,
  })
  for (const destination of ['preferences', 'security']) {
    await otherPage.goto(`http://127.0.0.1:4175/#/center/${destination}`)
    await expect(otherPage.locator('h1')).toBeVisible()
    if (destination === 'preferences')
      await expect(otherPage.getByRole('button', { name: '保存用餐偏好' })).toBeVisible()
    await audit(otherPage, destination)
    await otherPage.screenshot({
      path: path.resolve(
        root,
        `../screenshots/${destination === 'preferences' ? 'G5-06-用餐偏好-桌面' : 'G5-07-账号安全-桌面'}.png`,
      ),
      fullPage: true,
    })
  }
  console.log(
    'PASS production preview: assets, hash routes, remembered login and new-tab session validation.',
  )
  await page.route('**/api/auth/session', (route) => route.abort())
  await page.reload()
  await expect(page).toHaveURL(/service-unavailable/)
  await audit(page, 'service-unavailable')
  if (!(await page.evaluate(() => !!localStorage.getItem('shiguang.user.v1'))))
    throw new Error('A network failure incorrectly destroyed the session.')
  await page.unroute('**/api/auth/session')
  await page.getByRole('button', { name: '重新连接' }).click()
  await expect(page.getByTestId('account-summary')).toBeVisible()
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.screenshot({
    path: path.resolve(root, '../screenshots/G5-05-个人中心-手机.png'),
    fullPage: true,
  })
  if (runtimeErrors.length) throw new Error(runtimeErrors.join('\n'))
  console.log(
    'PASS production preview: offline recovery, preserved session, reduced-motion mobile rendering; zero runtime exceptions.',
  )
  fs.writeFileSync(
    path.join(root, '.local/a11y-report.json'),
    JSON.stringify(accessibility, null, 2),
  )
  const violations = accessibility.filter((entry) => entry.violations.length)
  if (violations.length) {
    console.log(JSON.stringify(violations, null, 2))
    throw new Error(
      'Accessible names/contrast checks need corrections; see .local/a11y-report.json.',
    )
  }
  console.log(
    `PASS accessibility: ${accessibility.length} production pages, zero automatically detected WCAG A/AA violations.`,
  )
} finally {
  if (browser) await browser.close()
  const exits = children.map((child) =>
    child.exitCode === null ? once(child, 'exit') : Promise.resolve(),
  )
  for (const child of children) if (child.exitCode === null) child.kill()
  await Promise.allSettled(exits)
}
