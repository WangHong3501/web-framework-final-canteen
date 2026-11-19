const path = require('node:path')
const crypto = require('node:crypto')
const jsonServer = require('json-server')
const { prepareDatabase } = require('./db.cjs')
const { registerAuth } = require('./auth.cjs')

const ORDER_STATUS = ['pending', 'preparing', 'ready', 'completed', 'refunded']
const MERCHANT_NEXT = { pending: 'preparing', preparing: 'ready', ready: 'completed' }

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function createApp(options = {}) {
  const dbFile = prepareDatabase(options.dbFile)
  const server = jsonServer.create()
  const router = jsonServer.router(dbFile)
  server.use(
    jsonServer.defaults({
      logger: options.logger ?? false,
      static: path.resolve(__dirname, '../public'),
    }),
  )
  server.use(jsonServer.bodyParser)
  server.get('/health', (_req, res) => res.json({ status: 'ok', service: 'shiguang-campus-api' }))
  const { requireSession } = registerAuth(server, router.db, {
    ...options,
    credentialFile: options.credentialFile || path.join(path.dirname(dbFile), 'auth.runtime.json'),
  })
  server.use(requireSession)
  server.use((req, res, next) => {
    // Shared seed users must never expose authentication internals or allow role changes.
    const resource = req.path.split('/')[1]
    if (resource === 'users' || resource === 'db')
      return res
        .status(403)
        .json({ message: '请通过本人账户接口访问个人资料。', code: 'FORBIDDEN' })
    if (!['dishes', 'stalls', 'orders'].includes(resource))
      return res.status(404).json({ message: '未找到这个服务。', code: 'NOT_FOUND' })
    if (
      !['GET', 'HEAD'].includes(req.method) &&
      ['dishes', 'stalls'].includes(req.path.split('/')[1]) &&
      req.auth.user.role !== 'merchant'
    )
      return res.status(403).json({ message: '该操作仅限档口商家。', code: 'FORBIDDEN' })
    // ---- 订单领域：学生仅可下单 / 查看自己的订单 / 确认取餐；商家可查看全部并推进状态 ----
    if (req.path === '/orders' || req.path.startsWith('/orders/')) {
      const user = req.auth.user
      const isMerchant = user.role === 'merchant'
      const orderId = req.path.split('/')[2]
      const table = router.db.get('orders')

      // 学生创建订单：服务端重新核算价格，禁止信任前端金额。
      if (req.path === '/orders' && req.method === 'POST') {
        if (isMerchant)
          return res.status(403).json({ message: '商家账户不能提交点餐订单。', code: 'FORBIDDEN' })
        const { items, remark = '', meal = 'lunch' } = req.body || {}
        if (!Array.isArray(items) || !items.length || items.length > 50)
          return res.status(422).json({ message: '餐车为空或菜品数量异常。', code: 'INVALID_ITEMS' })
        const dishTable = router.db.get('dishes')
        const normalized = []
        for (const line of items) {
          const dish = dishTable.find({ id: line.dishId }).value()
          const qty = Number(line.qty)
          if (!dish || !Number.isInteger(qty) || qty < 1 || qty > 20)
            return res.status(422).json({ message: '菜品信息或数量不正确。', code: 'INVALID_ITEMS' })
          if (dish.status === 'danger' || dish.soldOut)
            return res
              .status(422)
              .json({ message: `「${dish.name}」今日已售罄。`, code: 'DISH_SOLD_OUT' })
          normalized.push({
            dishId: dish.id,
            name: dish.name,
            image: dish.image,
            price: round2(dish.price),
            qty,
          })
        }
        const total = round2(normalized.reduce((sum, line) => sum + line.price * line.qty, 0))
        const order = {
          id: `SG${Date.now().toString().slice(-8)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
          userId: user.id,
          userName: user.displayName || user.name,
          items: normalized,
          total,
          remark: String(remark).slice(0, 100),
          meal,
          status: 'preparing',
          pickupCode: String(Math.floor(1000 + Math.random() * 9000)),
          window: 'A 窗口',
          eta: '约 15 分钟',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        table.push(order).write()
        return res.status(201).json(order)
      }

      // 更新订单状态：商家推进下一状态；学生仅可确认取餐（ready → completed）。
      if (req.path.startsWith('/orders/') && req.method === 'PUT') {
        const order = table.find({ id: orderId }).value()
        if (!order)
          return res.status(404).json({ message: '未找到这笔订单。', code: 'NOT_FOUND' })
        const { status, action } = req.body || {}
        const owned = String(order.userId) === String(user.id)
        if (!isMerchant && !owned)
          return res.status(403).json({ message: '只能操作自己的订单。', code: 'FORBIDDEN' })
        if (isMerchant) {
          const next = action === 'next' ? MERCHANT_NEXT[order.status] : status
          if (!next || !ORDER_STATUS.includes(next) || next === order.status)
            return res.status(422).json({ message: '订单状态无法这样变更。', code: 'INVALID_STATUS' })
          table.find({ id: orderId }).assign({ status: next, updatedAt: new Date().toISOString() }).write()
          return res.json(table.find({ id: orderId }).value())
        }
        if (action === 'confirm' && order.status === 'ready') {
          table.find({ id: orderId }).assign({ status: 'completed', updatedAt: new Date().toISOString() }).write()
          return res.json(table.find({ id: orderId }).value())
        }
        return res.status(403).json({ message: '当前订单不能由你变更状态。', code: 'FORBIDDEN' })
      }

      if (req.method !== 'GET')
        return res.status(405).json({ message: '不支持的请求方式。', code: 'METHOD_NOT_ALLOWED' })

      const all = table.value()
      const visible = isMerchant ? all : all.filter((order) => String(order.userId) === String(user.id))
      if (req.path === '/orders') return res.json(visible)
      const order = visible.find((item) => String(item.id) === orderId)
      return order
        ? res.json(order)
        : res.status(404).json({ message: '未找到这笔订单。', code: 'NOT_FOUND' })
    }
    return next()
  })
  server.use(router)
  server.use((err, _req, res, _next) => {
    if (err instanceof SyntaxError)
      return res.status(400).json({ message: '请求内容格式不正确。', code: 'INVALID_JSON' })
    console.error('[api]', err.message)
    return res
      .status(500)
      .json({ message: '服务暂时无法完成请求，请稍后重试。', code: 'INTERNAL_ERROR' })
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
