/**
 * 桌面端阅读密度验收：字号更大、图片更多，且 Vant 手机预览不受影响。
 * 只读验证，不产生订单、不改数据。
 */
import { chromium } from '@playwright/test'

const BASE = 'http://127.0.0.1:5173'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
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
async function login(page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('请输入你的学号').fill('32605150621')
  await page.getByPlaceholder('请输入登录密码').fill('Shiguang@2026')
  await page.getByRole('button', { name: '登录食光校园' }).click()
  await page.waitForTimeout(700)
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', (error) => errors.push(error.message))
  await login(page)

  await page.goto(`${BASE}/#/menu`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const heroImg = page.locator('.order-hero__visual img')
  check('菜单 Hero 增加真实菜品大图', await heroImg.isVisible())
  const titleSize = await page.locator('.order-hero h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  check('菜单主标题字号放大', titleSize >= 30, `${titleSize}px`)
  const columns = await page.locator('.dish-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
  check('菜品网格改为大图 3 列', columns === 3, `${columns} 列`)
  const foodSize = await page.locator('.food-name').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  check('菜品名字号放大', foodSize >= 16, `${foodSize}px`)
  check('菜单无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))

  await page.goto(`${BASE}/#/orders`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  if (await page.locator('.order-row').count()) {
    check('订单页有订单列表', true)
  } else {
    check('空订单页增加推荐图区', (await page.locator('.suggest-strip').count()) === 1)
    check('推荐图区有 8 张菜品图', (await page.locator('.suggest-card img').count()) === 8)
  }
  check('订单页无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))

  await page.goto(`${BASE}/#/mobile`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const mobileToken = await page.locator('.mobile-order-page').evaluate((el) => getComputedStyle(el).getPropertyValue('--fs-14').trim())
  check('Vant 手机预览字号令牌未被桌面层改写', mobileToken === '14px', `--fs-14=${mobileToken}`)

  check('无运行时错误', errors.length === 0, errors.join(' | '))
  console.log(`\n===== 桌面密度：${pass}/${pass + fail} PASS, ${fail} FAIL =====`)
} finally {
  await browser.close()
}
process.exit(fail ? 1 : 0)
