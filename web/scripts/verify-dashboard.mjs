/**
 * 商家经营概览验收：只读验证，不产生订单、不改数据。
 * 覆盖：角色可达/拦截、四项指标、热销与状态面板、导航入口、控制台错误、截图。
 */
import { chromium } from '@playwright/test'

const BASE = 'http://127.0.0.1:5173'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const SHOT = 'D:/桌面/小组食堂项目 - 副本/web-framework-final-canteen/screenshots/G5-14-admin-dashboard.png'

const browser = await chromium.launch({ headless: true, executablePath: EDGE })
let pass = 0
let fail = 0
const errors = []
function check(name, cond, detail = '') {
  if (cond) {
    pass++
    console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`)
  } else {
    fail++
    console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`)
  }
}
async function login(page, account) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder(/学号|商家账号/).fill(account)
  await page.getByPlaceholder('请输入登录密码').fill('Shiguang@2026')
  const roleBtn =
    account === 'merchant01'
      ? page.getByRole('button', { name: /档口商家/ })
      : page.getByRole('button', { name: /我是学生/ })
  if (await roleBtn.count()) await roleBtn.first().click()
  await page.getByRole('button', { name: '登录食光校园' }).click()
  await page.waitForTimeout(700)
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', (error) => errors.push(error.message))

  await login(page, 'merchant01')
  check('管理员登录后侧栏出现经营概览', (await page.getByText('经营概览', { exact: true }).count()) > 0)
  check('管理员登录后侧栏出现档口管理', (await page.getByText('档口管理', { exact: true }).count()) > 0)
  check('管理员顶部导航显示订单工作台', (await page.getByText('订单工作台', { exact: true }).count()) > 0)

  await page.goto(`${BASE}/#/admin/overview`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  check('经营概览页面可达', (await page.locator('[data-testid="admin-dashboard"]').count()) === 1)
  check('四项经营指标齐全', (await page.locator('.dash-metric').count()) === 4)
  check('热销菜品面板有内容', (await page.locator('.dash-hot li').count()) > 0, `条目=${await page.locator('.dash-hot li').count()}`)
  check('订单状态分布有 4 行', (await page.locator('.dash-status li').count()) === 4)
  check('经营概览大图横幅存在', (await page.locator('.dash-hero__visual img').count()) === 1)
  const hotImgWidth = await page.locator('.dash-hot__img').first().evaluate((el) => Math.round(el.getBoundingClientRect().width))
  check('热销菜品图片已放大', hotImgWidth >= 56, `宽度=${hotImgWidth}px`)
  check('无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${await page.evaluate(() => document.documentElement.scrollWidth)}px`)

  await page.screenshot({ path: SHOT, fullPage: true })
  check('截图已生成', true, SHOT)
  await page.close()

  const student = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  student.on('pageerror', (error) => errors.push('[student] ' + error.message))
  await login(student, '32605150621')
  await student.goto(`${BASE}/#/admin/overview`, { waitUntil: 'networkidle' })
  await student.waitForTimeout(400)
  check('学生访问经营概览被拦截', /forbidden/.test(student.url()), student.url().split('#')[1])
  await student.close()

  check('无运行时错误', errors.length === 0, errors.join(' | '))
  console.log(`\n===== 经营概览：${pass}/${pass + fail} PASS, ${fail} FAIL =====`)
} finally {
  await browser.close()
}
process.exit(fail ? 1 : 0)
