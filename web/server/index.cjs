const path = require('node:path')
const crypto = require('node:crypto')
const jsonServer = require('json-server')
const {
  prepareDatabase,
  MEALS,
  CATEGORIES,
  DISH_STATUS,
  ORDER_STATUS,
  SPICE_LEVELS,
  TAG_TYPES,
  isMoney,
} = require('./db.cjs')
const { registerAuth } = require('./auth.cjs')

const MERCHANT_NEXT = { pending: 'preparing', preparing: 'ready', ready: 'completed' }
const DISH_FIELDS = new Set([
  'id',
  'name',
  'price',
  'originalPrice',
  'image',
  'desc',
  'stall',
  'stallId',
  'category',
  'meal',
  'status',
  'badges',
  'spice',
  'tags',
  'rating',
  'sales',
])
// 这些字段可以随完整对象一起提交，但服务端不会按提交值改写。
const DISH_READ_ONLY = new Set(['id', 'stall', 'stallId', 'rating', 'sales'])
const ORDER_CREATE_FIELDS = new Set(['items', 'remark', 'meal', 'total', 'stallId'])
const ORDER_UPDATE_FIELDS = new Set(['action', 'status'])
const ITEM_FIELDS = new Set(['dishId', 'qty'])

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function replyError(res, status, code, message, extra = {}) {
  return res.status(status).json({ message, code, ...extra })
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasControlChars(value) {
  return /[\u0000-\u001f\u007f]/.test(value)
}

function isSoldOut(dish) {
  return dish?.status === 'danger' || dish?.soldOut === true || dish?.available === false
}

/**
 * 菜品写接口的字段白名单。未知字段直接 422，服务端托管字段只校验不改写。
 * 返回值中的 data 只包含通过校验的字段，handler 再决定哪些可以落库。
 */
function parseDishInput(body, { partial = false } = {}) {
  if (!isObject(body)) return { errors: [{ field: 'body', message: '请求体必须是 JSON 对象' }] }
  const errors = []
  const add = (field, message) => errors.push({ field, message })
  const unknown = Object.keys(body).filter((key) => !DISH_FIELDS.has(key))
  for (const field of unknown) add(field, `不支持的字段 ${field}`)
  if (!partial) {
    for (const field of ['name', 'price'])
      if (body[field] === undefined) add(field, `${field} 为必填字段`)
  }

  const data = {}
  if (body.name !== undefined) {
    if (
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      body.name.length > 40 ||
      hasControlChars(body.name)
    )
      add('name', '菜名需为 1–40 个字符，且不能包含控制字符')
    else data.name = body.name.trim()
  }
  if (body.price !== undefined) {
    if (!isMoney(body.price)) add('price', '价格需在 0.01–999 元之间，最多两位小数')
    else data.price = body.price
  }
  if (body.originalPrice !== undefined) {
    if (!isMoney(body.originalPrice)) add('originalPrice', '原价需在 0.01–999 元之间')
    else data.originalPrice = body.originalPrice
  }
  if (body.image !== undefined) {
    if (
      typeof body.image !== 'string' ||
      body.image.length > 300 ||
      !/^(\/images\/|https?:\/\/)/.test(body.image)
    )
      add('image', '图片需使用 /images/ 本地路径或 http(s) 地址')
    else data.image = body.image
  }
  if (body.desc !== undefined) {
    if (
      typeof body.desc !== 'string' ||
      body.desc.length > 120 ||
      hasControlChars(body.desc)
    )
      add('desc', '描述最多 120 个字符，且不能包含控制字符')
    else data.desc = body.desc.trim()
  }
  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) add('category', '菜品分类不在允许的枚举内')
    else data.category = body.category
  }
  if (body.meal !== undefined) {
    if (!MEALS.includes(body.meal)) add('meal', '餐次不在允许的枚举内')
    else data.meal = body.meal
  }
  if (body.status !== undefined) {
    if (!DISH_STATUS.includes(body.status)) add('status', '售卖状态不在允许的枚举内')
    else data.status = body.status
  }
  if (body.badges !== undefined) {
    if (!Array.isArray(body.badges) || body.badges.length > 3)
      add('badges', 'badges 必须是最多 3 项的数组')
    else if (body.badges.some((badge) => typeof badge !== 'string' || !badge.trim() || badge.length > 8))
      add('badges', '每个角标需为 1–8 个字符')
    else data.badges = [...new Set(body.badges.map((badge) => badge.trim()))]
  }
  if (body.spice !== undefined) {
    if (!SPICE_LEVELS.includes(body.spice)) add('spice', '辣度需为 0–3 的整数')
    else data.spice = body.spice
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.length > 3)
      add('tags', 'tags 必须是最多 3 项的数组')
    else {
      const tags = []
      for (const [index, tag] of body.tags.entries()) {
        if (!isObject(tag)) {
          add(`tags[${index}]`, '标签必须是对象')
          continue
        }
        const extra = Object.keys(tag).filter((key) => !['text', 'type'].includes(key))
        for (const field of extra) add(`tags[${index}].${field}`, '标签只支持 text/type 字段')
        if (typeof tag.text !== 'string' || !tag.text.trim() || tag.text.length > 8)
          add(`tags[${index}].text`, '标签文字需为 1–8 个字符')
        if (!TAG_TYPES.includes(tag.type)) add(`tags[${index}].type`, '标签类型不在枚举内')
        tags.push({ text: tag.text?.trim(), type: tag.type })
      }
      if (!errors.some((item) => item.field.startsWith('tags'))) data.tags = tags
    }
  }
  if (body.rating !== undefined) {
    if (typeof body.rating !== 'number' || !Number.isFinite(body.rating) || body.rating < 0 || body.rating > 5)
      add('rating', '评分需在 0–5 之间')
    else data.rating = body.rating
  }
  if (body.sales !== undefined) {
    if (!Number.isInteger(body.sales) || body.sales < 0 || body.sales > 1_000_000)
      add('sales', '销量需为非负整数')
    else data.sales = body.sales
  }
  if (body.id !== undefined) {
    if (typeof body.id !== 'string' || !body.id) add('id', 'id 必须是非空字符串')
    else data.id = body.id
  }
  if (body.stallId !== undefined) {
    if (typeof body.stallId !== 'string' || !body.stallId) add('stallId', 'stallId 必须是非空字符串')
    else data.stallId = body.stallId
  }
  if (body.stall !== undefined) {
    if (typeof body.stall !== 'string' || !body.stall) add('stall', 'stall 必须是非空字符串')
    else data.stall = body.stall
  }

  return { errors, data }
}

function invalidDish(res, errors) {
  const first = errors[0]
  return replyError(
    res,
    422,
    'INVALID_FIELDS',
    first ? `菜品信息不符合要求：${first.message}` : '菜品信息不符合要求。',
    { fields: errors.map((item) => item.field) },
  )
}

function resolveMerchantStall(user, stalls) {
  if (user.role !== 'merchant' || !user.stallId) return null
  return stalls.find({ id: user.stallId }).value() || null
}

function nextDishId(dishes) {
  let max = 0
  for (const dish of dishes.value()) {
    const matched = /^dish-(\d+)$/.exec(String(dish.id))
    if (matched) max = Math.max(max, Number(matched[1]))
  }
  let next = max + 1
  while (dishes.find({ id: `dish-${String(next).padStart(2, '0')}` }).value()) next += 1
  return `dish-${String(next).padStart(2, '0')}`
}

function nextOrderId(orders, at) {
  const date = new Date(at).toISOString().slice(2, 10).replace(/-/g, '')
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const id = `SG${date}${crypto.randomBytes(2).toString('hex').toUpperCase()}`
    if (!orders.find({ id }).value()) return id
  }
  throw new Error('无法生成唯一订单号')
}

function nextPickupCode(orders) {
  const active = new Set(
    orders
      .value()
      .filter((order) => ['pending', 'preparing', 'ready'].includes(order.status))
      .map((order) => String(order.pickupCode || '')),
  )
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = String(Math.floor(1000 + Math.random() * 9000))
    if (!active.has(code)) return code
  }
  return String(1000 + (orders.value().length % 9000))
}

function merchantOwnsOrder(order, user, dishes) {
  if (!user.stallId) return false
  if (order.stallId) return order.stallId === user.stallId
  // 兼容早期没有 stallId 的订单：按明细菜品反查档口。
  const stallIds = new Set(
    (order.items || [])
      .map((item) => dishes.find({ id: item.dishId }).value()?.stallId)
      .filter(Boolean),
  )
  return stallIds.size === 1 && stallIds.has(user.stallId)
}

function createApp(options = {}) {
  const dbFile = prepareDatabase(options.dbFile)
  const server = jsonServer.create()
  const router = jsonServer.router(dbFile)
  const clock = options.clock || Date.now
  server.use(
    jsonServer.defaults({
      logger: options.logger ?? false,
      static: path.resolve(__dirname, '../public'),
    }),
  )
  server.use(jsonServer.bodyParser)
  server.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.json({ status: 'ok', service: 'shiguang-campus-api' })
  })
  const { requireSession } = registerAuth(server, router.db, {
    ...options,
    credentialFile: options.credentialFile || path.join(path.dirname(dbFile), 'auth.runtime.json'),
  })
  server.use(requireSession)

  const dishes = router.db.get('dishes')
  const stalls = router.db.get('stalls')
  const orders = router.db.get('orders')

  server.use((req, res, next) => {
    const segments = req.path.split('/').filter(Boolean)
    const resource = segments[0]
    const id = segments[1]
    const method = req.method
    const isRead = method === 'GET' || method === 'HEAD'

    if (resource === 'users' || resource === 'db')
      return replyError(res, 403, 'FORBIDDEN', '请通过本人账户接口访问个人资料。')
    if (!['dishes', 'stalls', 'orders'].includes(resource))
      return replyError(res, 404, 'NOT_FOUND', '未找到这个服务。')
    if (segments.length > 2)
      return replyError(res, 404, 'NOT_FOUND', '未找到这个资源。')

    // ---- 档口：只读目录，写操作统一拒绝 ----
    if (resource === 'stalls') {
      if (!isRead)
        return replyError(res, 403, 'FORBIDDEN', '档口资料由管理员维护，商家不能直接改写。')
      if (!id) return res.json(stalls.value())
      const stall = stalls.find({ id }).value()
      return stall
        ? res.json(stall)
        : replyError(res, 404, 'NOT_FOUND', '未找到这个档口。')
    }

    // ---- 菜品：登录后可读；商家只能维护本档口 ----
    if (resource === 'dishes') {
      if (isRead) {
        if (!id) {
          let list = dishes.value()
          const { stallId, stall, meal, category, status, q } = req.query
          if (stallId !== undefined) list = list.filter((dish) => dish.stallId === stallId)
          if (stall !== undefined) list = list.filter((dish) => dish.stall === stall)
          if (meal !== undefined) {
            if (!MEALS.includes(meal))
              return replyError(res, 422, 'INVALID_QUERY', 'meal 查询参数不在枚举内。')
            list = list.filter((dish) => dish.meal === meal)
          }
          if (category !== undefined) {
            if (!CATEGORIES.includes(category))
              return replyError(res, 422, 'INVALID_QUERY', 'category 查询参数不在枚举内。')
            list = list.filter((dish) => dish.category === category)
          }
          if (status !== undefined) {
            if (!DISH_STATUS.includes(status))
              return replyError(res, 422, 'INVALID_QUERY', 'status 查询参数不在枚举内。')
            list = list.filter((dish) => dish.status === status)
          }
          if (typeof q === 'string' && q.trim()) {
            const keyword = q.trim().toLowerCase()
            list = list.filter((dish) =>
              [dish.name, dish.desc, dish.stall, dish.category].some((value) =>
                String(value || '').toLowerCase().includes(keyword),
              ),
            )
          }
          return res.json(list)
        }
        const dish = dishes.find({ id }).value()
        return dish
          ? res.json(dish)
          : replyError(res, 404, 'NOT_FOUND', '未找到这个菜品。')
      }

      if (req.auth.user.role !== 'merchant')
        return replyError(res, 403, 'FORBIDDEN', '该操作仅限档口商家。')
      const stall = resolveMerchantStall(req.auth.user, stalls)
      if (!stall)
        return replyError(res, 403, 'FORBIDDEN', '商家账号未绑定有效档口，无法维护菜品。')

      if (!id) {
        if (method !== 'POST')
          return replyError(res, 405, 'METHOD_NOT_ALLOWED', '不支持的请求方式。')
        const { errors, data } = parseDishInput(req.body)
        if (errors.length) return invalidDish(res, errors)
        if (data.stallId !== undefined && data.stallId !== stall.id)
          return replyError(res, 403, 'FORBIDDEN', '只能新增本档口的菜品。')
        if (data.stall !== undefined && data.stall !== stall.name)
          return replyError(res, 403, 'FORBIDDEN', '只能新增本档口的菜品。')
        if (data.originalPrice !== undefined && data.originalPrice < data.price)
          return invalidDish(res, [{ field: 'originalPrice', message: '原价不能低于现价' }])
        const dish = {
          id: nextDishId(dishes),
          name: data.name,
          price: data.price,
          ...(data.originalPrice !== undefined ? { originalPrice: data.originalPrice } : {}),
          image: data.image || '/images/fresh-bowl.jpg',
          desc: data.desc || '',
          stall: stall.name,
          stallId: stall.id,
          category: data.category || '家常小炒',
          meal: data.meal || 'lunch',
          status: data.status || 'success',
          badges: data.badges || [],
          spice: data.spice ?? 0,
          tags: data.tags || [],
          rating: 0,
          sales: 0,
        }
        dishes.push(dish).write()
        return res.status(201).json(dish)
      }

      const current = dishes.find({ id }).value()
      if (!current) return replyError(res, 404, 'NOT_FOUND', '未找到这个菜品。')
      if (current.stallId !== stall.id)
        return replyError(res, 403, 'FORBIDDEN', '只能维护本档口的菜品。')

      if (method === 'DELETE') {
        dishes.remove({ id }).write()
        return res.status(204).end()
      }
      if (!['PUT', 'PATCH'].includes(method))
        return replyError(res, 405, 'METHOD_NOT_ALLOWED', '不支持的请求方式。')

      const { errors, data } = parseDishInput(req.body, { partial: true })
      if (errors.length) return invalidDish(res, errors)
      if (data.id !== undefined && data.id !== id)
        return invalidDish(res, [{ field: 'id', message: '不能修改菜品 id' }])
      if (data.stallId !== undefined && data.stallId !== stall.id)
        return replyError(res, 403, 'FORBIDDEN', '不能把菜品移动到其他档口。')
      if (data.stall !== undefined && data.stall !== stall.name)
        return replyError(res, 403, 'FORBIDDEN', '不能把菜品移动到其他档口。')
      const nextPrice = data.price ?? current.price
      const nextOriginal =
        data.originalPrice !== undefined ? data.originalPrice : current.originalPrice
      if (nextOriginal !== undefined && nextOriginal < nextPrice)
        return invalidDish(res, [{ field: 'originalPrice', message: '原价不能低于现价' }])

      const patch = {}
      for (const [key, value] of Object.entries(data))
        if (!DISH_READ_ONLY.has(key)) patch[key] = value
      if (!Object.keys(patch).length) return res.json(current)
      const updated = { ...current, ...patch, stall: stall.name, stallId: stall.id }
      dishes.find({ id }).assign(updated).write()
      return res.json(updated)
    }

    // ---- 订单：学生仅本人；商家可看全部，但只能推进本档口订单 ----
    const user = req.auth.user
    const isMerchant = user.role === 'merchant'

    if (!id) {
      if (method === 'POST') {
        if (isMerchant)
          return replyError(res, 403, 'FORBIDDEN', '商家账户不能提交点餐订单。')
        if (!isObject(req.body))
          return replyError(res, 422, 'INVALID_ORDER', '请求体必须是 JSON 对象。')
        const unknown = Object.keys(req.body).filter((key) => !ORDER_CREATE_FIELDS.has(key))
        if (unknown.length)
          return replyError(res, 422, 'INVALID_FIELDS', `不支持的字段：${unknown.join('、')}`, {
            fields: unknown,
          })
        const { items, remark, meal } = req.body
        if (!Array.isArray(items) || !items.length || items.length > 50)
          return replyError(res, 422, 'INVALID_ITEMS', '餐车为空或菜品数量异常。')
        if (meal !== undefined && !MEALS.includes(meal))
          return replyError(res, 422, 'INVALID_MEAL', '餐次不在允许的枚举内。')
        if (
          remark !== undefined &&
          (typeof remark !== 'string' || remark.length > 100 || hasControlChars(remark))
        )
          return replyError(res, 422, 'INVALID_REMARK', '备注最多 100 个字符，且不能包含控制字符。')

        const normalized = []
        const seenDishes = new Set()
        const stallIds = new Set()
        for (const line of items) {
          if (!isObject(line))
            return replyError(res, 422, 'INVALID_ITEMS', '菜品明细必须是对象。')
          const extra = Object.keys(line).filter((key) => !ITEM_FIELDS.has(key))
          if (extra.length)
            return replyError(res, 422, 'INVALID_ITEMS', '菜品明细只支持 dishId 与 qty。', {
              fields: extra,
            })
          const dishId = line.dishId
          const qty = line.qty
          if (typeof dishId !== 'string' || !dishId)
            return replyError(res, 422, 'INVALID_ITEMS', '菜品 id 不能为空。')
          if (!Number.isInteger(qty) || qty < 1 || qty > 20)
            return replyError(res, 422, 'INVALID_ITEMS', '单个菜品数量需为 1–20 的整数。')
          if (seenDishes.has(dishId))
            return replyError(res, 422, 'INVALID_ITEMS', '同一菜品请合并为一行。')
          seenDishes.add(dishId)
          const dish = dishes.find({ id: dishId }).value()
          if (!dish)
            return replyError(res, 422, 'INVALID_ITEMS', '订单中包含不存在的菜品。')
          if (isSoldOut(dish))
            return replyError(res, 422, 'DISH_SOLD_OUT', `「${dish.name}」今日已售罄。`)
          if (!dish.stallId)
            return replyError(res, 422, 'INVALID_ITEMS', `「${dish.name}」缺少档口信息。`)
          stallIds.add(dish.stallId)
          normalized.push({
            dishId: dish.id,
            name: dish.name,
            image: dish.image,
            price: round2(dish.price),
            qty,
          })
        }
        if (stallIds.size > 1)
          return replyError(
            res,
            422,
            'MIXED_STALLS',
            '一笔订单只能选择一个档口，请分开下单。',
          )
        const stall = stalls.find({ id: [...stallIds][0] }).value()
        if (!stall)
          return replyError(res, 422, 'INVALID_ITEMS', '订单档口不存在，请刷新菜单后重试。')
        const total = round2(normalized.reduce((sum, line) => sum + line.price * line.qty, 0))
        const now = new Date(clock()).toISOString()
        const order = {
          id: nextOrderId(orders, clock()),
          userId: user.id,
          userName: user.displayName || user.name,
          stallId: stall.id,
          stallName: stall.name,
          items: normalized,
          total,
          remark: remark ? remark.trim() : '',
          meal: meal || 'lunch',
          status: 'preparing',
          pickupCode: nextPickupCode(orders),
          window: stall.window ? `${stall.name} · ${stall.window}` : stall.name,
          eta: '约 15 分钟',
          createdAt: now,
          updatedAt: now,
        }
        orders.push(order).write()
        return res.status(201).json(order)
      }

      if (method !== 'GET' && method !== 'HEAD')
        return replyError(res, 405, 'METHOD_NOT_ALLOWED', '不支持的请求方式。')

      let visible = isMerchant
        ? orders.value()
        : orders.value().filter((order) => String(order.userId) === String(user.id))
      const { status, meal } = req.query
      if (status !== undefined) {
        if (!ORDER_STATUS.includes(status))
          return replyError(res, 422, 'INVALID_QUERY', 'status 查询参数不在枚举内。')
        visible = visible.filter((order) => order.status === status)
      }
      if (meal !== undefined) {
        if (!MEALS.includes(meal))
          return replyError(res, 422, 'INVALID_QUERY', 'meal 查询参数不在枚举内。')
        visible = visible.filter((order) => order.meal === meal)
      }
      const sorted = [...visible].sort(
        (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0),
      )
      return res.json(sorted)
    }

    const order = orders.find({ id }).value()
    if (!order) return replyError(res, 404, 'NOT_FOUND', '未找到这笔订单。')

    if (method === 'GET' || method === 'HEAD') {
      if (!isMerchant && String(order.userId) !== String(user.id))
        return replyError(res, 404, 'NOT_FOUND', '未找到这笔订单。')
      return res.json(order)
    }
    if (method !== 'PUT' && method !== 'PATCH')
      return replyError(res, 405, 'METHOD_NOT_ALLOWED', '不支持的请求方式。')

    if (!isObject(req.body))
      return replyError(res, 422, 'INVALID_ORDER', '请求体必须是 JSON 对象。')
    const unknown = Object.keys(req.body).filter((key) => !ORDER_UPDATE_FIELDS.has(key))
    if (unknown.length)
      return replyError(res, 422, 'INVALID_FIELDS', `不支持的字段：${unknown.join('、')}`, {
        fields: unknown,
      })
    const { action, status } = req.body
    if (action !== undefined && !['next', 'confirm'].includes(action))
      return replyError(res, 422, 'INVALID_STATUS', 'action 只支持 next 或 confirm。')
    if (status !== undefined && !ORDER_STATUS.includes(status))
      return replyError(res, 422, 'INVALID_STATUS', '订单状态不在允许的枚举内。')
    if (action !== undefined && status !== undefined)
      return replyError(res, 422, 'INVALID_STATUS', 'action 与 status 只能提交一个。')

    if (isMerchant) {
      if (!merchantOwnsOrder(order, user, dishes))
        return replyError(res, 403, 'FORBIDDEN', '只能推进本档口的订单。')
      if (action === 'confirm')
        return replyError(res, 422, 'INVALID_STATUS', '确认取餐只能由下单学生操作。')
      let next
      if (action === 'next') next = MERCHANT_NEXT[order.status]
      else if (status !== undefined) {
        const forward = MERCHANT_NEXT[order.status]
        if (status === forward) next = status
        else if (status === 'refunded' && ['pending', 'preparing'].includes(order.status))
          next = 'refunded'
      }
      if (!next || next === order.status)
        return replyError(res, 422, 'INVALID_STATUS', '订单状态不能这样变更。')
      orders
        .find({ id })
        .assign({ status: next, updatedAt: new Date(clock()).toISOString() })
        .write()
      return res.json(orders.find({ id }).value())
    }

    if (String(order.userId) !== String(user.id))
      return replyError(res, 403, 'FORBIDDEN', '只能操作自己的订单。')
    if (action === 'confirm' && order.status === 'ready') {
      orders
        .find({ id })
        .assign({ status: 'completed', updatedAt: new Date(clock()).toISOString() })
        .write()
      return res.json(orders.find({ id }).value())
    }
    return replyError(res, 403, 'FORBIDDEN', '当前订单不能由你变更状态。')
  })

  server.use((_req, res) =>
    replyError(res, 404, 'NOT_FOUND', '未找到这个服务。'),
  )
  server.use((err, _req, res, _next) => {
    if (res.headersSent) return
    if (err instanceof SyntaxError || err.type === 'entity.parse.failed')
      return replyError(res, 400, 'INVALID_JSON', '请求内容格式不正确。')
    if (err.type === 'entity.too.large')
      return replyError(res, 413, 'PAYLOAD_TOO_LARGE', '提交内容过大。')
    console.error('[api]', err.message)
    return replyError(res, 500, 'INTERNAL_ERROR', '服务暂时无法完成请求，请稍后重试。')
  })
  return server
}

if (require.main === module) {
  const port = Number(process.env.API_PORT || 3001)
  const server = createApp({ dbFile: process.env.DB_FILE, logger: true })
  const listener = server.listen(port, '127.0.0.1', () =>
    console.log(`Campus API ready: http://127.0.0.1:${port}`),
  )
  listener.on('error', (error) => {
    console.error(`API cannot start: ${error.message}`)
    process.exitCode = 1
  })
}
module.exports = { createApp }
