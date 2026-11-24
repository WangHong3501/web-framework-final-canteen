const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { categories: CATEGORIES, cuisines: CUISINES } = require('../src/shared/dish-taxonomy.json')

/**
 * 菜品分类和菜系由前后端共用的数据字典定义。
 */
const ROLES = ['student', 'merchant']
const CANTEENS = ['第一食堂', '第二食堂', '风味食堂']
const MEALS = ['breakfast', 'lunch', 'dinner', 'night']
const DISH_STATUS = ['success', 'warning', 'danger']
const TAG_TYPES = ['veg', 'halal', 'spicy']
const ORDER_STATUS = ['pending', 'preparing', 'ready', 'completed', 'refunded']
const SPICE_LEVELS = [0, 1, 2, 3]

const USER_SECRET_KEYS = ['password', 'passwordHash', 'salt', 'hash']

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isText(value, { min = 1, max = 120 } = {}) {
  return typeof value === 'string' && value.trim().length >= min && value.length <= max
}

/** 金额统一保留两位小数，避免 16.500000001 这类浮点误差进入接口。 */
function isMoney(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  if (value < 0.01 || value > 999) return false
  return Math.round(value * 100) === Number((value * 100).toFixed(4))
}

function isIntegerBetween(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max
}

function pushDuplicateErrors(errors, list, label) {
  const seen = new Set()
  for (const [index, item] of list.entries()) {
    const id = item?.id
    if (!isText(id, { max: 64 })) {
      errors.push(`${label}[${index}].id 必须是非空字符串`)
      continue
    }
    if (seen.has(id)) errors.push(`${label} 存在重复 id：${id}`)
    seen.add(id)
  }
  return seen
}

/**
 * 校验 `db.json` 种子。返回错误数组而不是直接抛错，便于测试逐条断言。
 * 运行数据库（.local）只做结构检查，避免旧版本地数据无法启动服务。
 */
function validateSeedData(db) {
  const errors = []
  if (!isObject(db)) return ['根节点必须是对象']

  for (const key of ['users', 'stalls', 'dishes', 'orders'])
    if (!Array.isArray(db[key])) errors.push(`缺少数组字段 ${key}`)
  if (errors.length) return errors

  const stallIds = pushDuplicateErrors(errors, db.stalls, 'stalls')
  const stallsById = new Map()
  for (const [index, stall] of db.stalls.entries()) {
    if (!isText(stall?.name, { max: 40 })) errors.push(`stalls[${index}].name 不合法`)
    if (!CANTEENS.includes(stall?.canteen)) errors.push(`stalls[${index}].canteen 不在枚举内`)
    if (stall?.desc !== undefined && typeof stall.desc !== 'string')
      errors.push(`stalls[${index}].desc 必须是字符串`)
    if (stall?.window !== undefined && !isText(stall.window, { max: 24 }))
      errors.push(`stalls[${index}].window 不合法`)
    if (stall?.id) stallsById.set(stall.id, stall)
  }

  const userIds = pushDuplicateErrors(errors, db.users, 'users')
  const accounts = new Set()
  for (const [index, user] of db.users.entries()) {
    if (!isText(user?.name, { max: 40 })) errors.push(`users[${index}].name 不合法`)
    if (!isText(user?.account, { max: 32 })) errors.push(`users[${index}].account 不合法`)
    if (accounts.has(user?.account)) errors.push(`users 存在重复 account：${user?.account}`)
    accounts.add(user?.account)
    if (!ROLES.includes(user?.role)) errors.push(`users[${index}].role 不在枚举内`)
    if (user?.role === 'merchant' && !stallIds.has(user?.stallId))
      errors.push(`users[${index}].stallId 未指向有效档口`)
    for (const key of USER_SECRET_KEYS)
      if (Object.prototype.hasOwnProperty.call(user || {}, key))
        errors.push(`users[${index}] 不得包含口令字段 ${key}`)
  }

  const dishIds = pushDuplicateErrors(errors, db.dishes, 'dishes')
  for (const [index, dish] of db.dishes.entries()) {
    const label = `dishes[${index}]`
    if (!isText(dish?.name, { max: 40 })) errors.push(`${label}.name 不合法`)
    if (!isMoney(dish?.price)) errors.push(`${label}.price 不合法`)
    if (dish?.originalPrice !== undefined) {
      if (!isMoney(dish.originalPrice)) errors.push(`${label}.originalPrice 不合法`)
      else if (dish.originalPrice < dish.price) errors.push(`${label}.originalPrice 不能低于 price`)
    }
    if (!isText(dish?.image, { max: 300 })) errors.push(`${label}.image 不合法`)
    if (!isText(dish?.desc, { max: 120 })) errors.push(`${label}.desc 不合法`)
    if (!stallIds.has(dish?.stallId)) errors.push(`${label}.stallId 未指向有效档口`)
    else if (dish?.stall !== stallsById.get(dish.stallId)?.name)
      errors.push(`${label}.stall 与 stallId 对应档口名称不一致`)
    if (!CATEGORIES.includes(dish?.category)) errors.push(`${label}.category 不在枚举内`)
    if (!CUISINES.includes(dish?.cuisine)) errors.push(`${label}.cuisine 不在枚举内`)
    if (!MEALS.includes(dish?.meal)) errors.push(`${label}.meal 不在枚举内`)
    if (!DISH_STATUS.includes(dish?.status)) errors.push(`${label}.status 不在枚举内`)
    if (!Array.isArray(dish?.badges) || dish.badges.length > 3)
      errors.push(`${label}.badges 必须是最多 3 项的数组`)
    if (!SPICE_LEVELS.includes(dish?.spice)) errors.push(`${label}.spice 不在枚举内`)
    if (!Array.isArray(dish?.tags) || dish.tags.length > 3)
      errors.push(`${label}.tags 必须是最多 3 项的数组`)
    else
      for (const [tagIndex, tag] of dish.tags.entries()) {
        if (!isText(tag?.text, { max: 8 })) errors.push(`${label}.tags[${tagIndex}].text 不合法`)
        if (!TAG_TYPES.includes(tag?.type))
          errors.push(`${label}.tags[${tagIndex}].type 不在枚举内`)
      }
    if (typeof dish?.rating !== 'number' || dish.rating < 0 || dish.rating > 5)
      errors.push(`${label}.rating 必须在 0–5 之间`)
    if (!isIntegerBetween(dish?.sales, 0, 1_000_000)) errors.push(`${label}.sales 不合法`)
  }

  pushDuplicateErrors(errors, db.orders, 'orders')
  for (const [index, order] of db.orders.entries()) {
    const label = `orders[${index}]`
    if (!userIds.has(order?.userId)) errors.push(`${label}.userId 未指向有效用户`)
    if (!ORDER_STATUS.includes(order?.status)) errors.push(`${label}.status 不在枚举内`)
    if (!isMoney(order?.total)) errors.push(`${label}.total 不合法`)
    if (!MEALS.includes(order?.meal)) errors.push(`${label}.meal 不在枚举内`)
    if (!Array.isArray(order?.items) || order.items.length === 0)
      errors.push(`${label}.items 必须是非空数组`)
    else
      for (const [itemIndex, item] of order.items.entries()) {
        const itemLabel = `${label}.items[${itemIndex}]`
        if (!dishIds.has(item?.dishId)) errors.push(`${itemLabel}.dishId 未指向有效菜品`)
        if (!isText(item?.name, { max: 40 })) errors.push(`${itemLabel}.name 不合法`)
        if (!isMoney(item?.price)) errors.push(`${itemLabel}.price 不合法`)
        if (!isIntegerBetween(item?.qty, 1, 20)) errors.push(`${itemLabel}.qty 不合法`)
      }
    if (order?.stallId !== undefined && !stallIds.has(order.stallId))
      errors.push(`${label}.stallId 未指向有效档口`)
    if (order?.createdAt !== undefined && Number.isNaN(Date.parse(order.createdAt)))
      errors.push(`${label}.createdAt 不是可解析的时间`)
    if (order?.pickupCode !== undefined && !/^\d{4}$/.test(String(order.pickupCode)))
      errors.push(`${label}.pickupCode 必须是 4 位数字`)
  }

  return errors
}

function assertSeed(db, source = 'db.json') {
  const errors = validateSeedData(db)
  if (!errors.length) return
  const detail = errors
    .slice(0, 12)
    .map((message) => `- ${message}`)
    .join('\n')
  const more = errors.length > 12 ? `\n- 其余 ${errors.length - 12} 条从略` : ''
  throw new Error(`种子数据校验失败（${source}）：\n${detail}${more}`)
}

function assertRuntimeShape(db, source) {
  if (!isObject(db)) throw new Error(`运行数据库格式不正确（${source}）`)
  for (const key of ['users', 'stalls', 'dishes', 'orders'])
    if (!Array.isArray(db[key])) throw new Error(`运行数据库缺少数组字段 ${key}（${source}）`)
}

function upgradeDemoData(runtime, data, seed) {
  const previous = data.catalog?.revision ?? 0
  const revision = seed.catalog?.revision ?? 0
  if (previous >= revision) return

  const existing = new Map(data.dishes.map((dish) => [dish?.id, dish]))
  const stalls = new Map(data.stalls.map((stall) => [stall?.id, stall?.name]))
  const addedStalls = new Set()
  // 有些旧运行库只有一个档口，且已被标为第 2 版。
  if (previous < 3) {
    for (const stall of seed.stalls) {
      if (stalls.has(stall.id)) continue
      data.stalls.push(stall)
      stalls.set(stall.id, stall.name)
      addedStalls.add(stall.id)
    }
    for (const user of seed.users.filter((entry) => entry.role === 'merchant')) {
      if (
        !data.users.some((current) => current?.id === user.id || current?.account === user.account)
      )
        data.users.push(user)
    }
  }
  for (const dish of seed.dishes) {
    const current = existing.get(dish.id)
    if (current) {
      if (current.name !== dish.name) continue
      if (previous < 1 && !current.cuisine) current.cuisine = dish.cuisine
      if (
        previous < 2 &&
        current.originalPrice === undefined &&
        current.price === dish.price &&
        dish.originalPrice > dish.price
      ) {
        current.originalPrice = dish.originalPrice
      }
      continue
    }
    // 补入的档口恢复完整菜单，已有档口只在首次升级时追加新编号的菜品。
    const stall = stalls.get(dish.stallId)
    if (
      stall &&
      (addedStalls.has(dish.stallId) || (previous < 1 && dish.id.startsWith('dish-seed-')))
    )
      data.dishes.push({ ...dish, stall })
  }
  data.catalog = { ...data.catalog, revision }

  const temporary = `${runtime}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' })
    fs.renameSync(temporary, runtime)
  } finally {
    fs.rmSync(temporary, { force: true })
  }
}

/**
 * 准备 json-server 使用的运行库：种子只读校验，运行库首次从种子复制。
 * 演示数据按版本补齐预设菜品、优惠和档口账号。
 */
function prepareDatabase(filePath) {
  const seedPath = path.resolve(__dirname, '../db.json')
  const runtime = path.resolve(filePath || path.join(__dirname, '../.local/db.runtime.json'))
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
  assertSeed(seed, seedPath)

  fs.mkdirSync(path.dirname(runtime), { recursive: true })
  if (!fs.existsSync(runtime)) {
    fs.copyFileSync(seedPath, runtime)
    return runtime
  }
  let runtimeData
  try {
    runtimeData = JSON.parse(fs.readFileSync(runtime, 'utf8'))
  } catch (error) {
    throw new Error(`运行数据库无法解析（${runtime}）：${error.message}`)
  }
  assertRuntimeShape(runtimeData, runtime)
  upgradeDemoData(runtime, runtimeData, seed)
  return runtime
}

module.exports = {
  ROLES,
  CANTEENS,
  MEALS,
  DISH_STATUS,
  TAG_TYPES,
  ORDER_STATUS,
  SPICE_LEVELS,
  isMoney,
  validateSeedData,
  assertSeed,
  prepareDatabase,
}
