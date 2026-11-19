/**
 * 双角色 UI 验收：分别以学生/管理员登录，验证页面可达、共享组件样式一致、无报错。
 * 只读验证，不产生订单、不改数据。
 */
import { chromium } from '@playwright/test'

const BASE = 'http://127.0.0.1:5173'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await chromium.launch({ headless: true, executablePath: EDGE })
let pass = 0, fail = 0
const errors = []
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`) }
  else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`) }
}
async function login(page, account) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder(/学号|商家账号/).fill(account)
  await page.getByPlaceholder('请输入登录密码').fill('Shiguang@2026')
  // 按身份切换按钮
  const roleBtn = account === 'merchant01'
    ? page.getByRole('button', { name: /档口商家/ })
    : page.getByRole('button', { name: /我是学生/ })
  if (await roleBtn.count()) await roleBtn.first().click()
  await page.getByRole('button', { name: '登录食光校园' }).click()
  await page.waitForTimeout(700)
}

async function styleOf(page, selector, prop) {
  const loc = page.locator(selector).first()
  if (!await loc.count()) return null
  return loc.evaluate((el, p) => getComputedStyle(el)[p], prop)
}

try {
  // ---------- 学生视角 ----------
  const sp = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  sp.on('pageerror', e => errors.push('[student] ' + e.message))
  await login(sp, '32605150621')
  check('学生登录后进入个人中心', /center/.test(sp.url()), sp.url().split('#')[1])

  await sp.goto(`${BASE}/#/menu`, { waitUntil: 'networkidle' }); await sp.waitForTimeout(400)
  check('学生可访问菜单页', await sp.locator('.add-btn').count() > 0, 'add按钮=' + await sp.locator('.add-btn').count())
  const sBrandBg = await styleOf(sp, '.order-hero', 'backgroundImage').catch(()=>null)

  await sp.goto(`${BASE}/#/admin/dishes`, { waitUntil: 'networkidle' }); await sp.waitForTimeout(500)
  check('学生访问档口管理被拦截', /forbidden|center|login/.test(sp.url()), sp.url().split('#')[1])
  await sp.close()

  // ---------- 管理员视角 ----------
  const mp = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  mp.on('pageerror', e => errors.push('[merchant] ' + e.message))
  await login(mp, 'merchant01')
  check('管理员登录后进入个人中心', /center/.test(mp.url()), mp.url().split('#')[1])

  await mp.goto(`${BASE}/#/admin/dishes`, { waitUntil: 'networkidle' }); await mp.waitForTimeout(500)
  check('管理员可访问档口管理', await mp.locator('.admin-table, .el-table').count() > 0, '表格=' + await mp.locator('.el-table').count())
  check('管理员页有新增菜品按钮', await mp.getByRole('button', { name: /新增菜品/ }).count() > 0)

  await mp.goto(`${BASE}/#/menu`, { waitUntil: 'networkidle' }); await mp.waitForTimeout(400)
  const mBrandBg = await styleOf(mp, '.order-hero', 'backgroundImage').catch(()=>null)
  check('共享菜单页 hero 样式双角色一致', sBrandBg === mBrandBg, `学生=${(sBrandBg||'').slice(0,30)} 管理员=${(mBrandBg||'').slice(0,30)}`)

  await mp.goto(`${BASE}/#/orders`, { waitUntil: 'networkidle' }); await mp.waitForTimeout(400)
  check('管理员订单页显示工作台标题', (await mp.locator('body').innerText()).includes('订单工作台'))
  await mp.close()

  check('无运行时错误', errors.length === 0, errors.join(' | '))

  console.log(`\n===== 双角色 UI：${pass}/${pass + fail} PASS, ${fail} FAIL =====`)
} finally {
  await browser.close()
}
process.exit(fail ? 1 : 0)
