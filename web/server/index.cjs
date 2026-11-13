const path = require('node:path')
const jsonServer = require('json-server')
const { prepareDatabase } = require('./db.cjs')
const { registerAuth } = require('./auth.cjs')

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
    // Order write and stall ownership policies are implemented with the order module.
    // Until then, keep this unfinished domain read-only rather than expose unsafe CRUD.
    if (req.path === '/orders' || req.path.startsWith('/orders/')) {
      if (req.method !== 'GET')
        return res.status(503).json({ message: '订单服务暂未开放。', code: 'MODULE_NOT_READY' })
      const ownOrders = router.db
        .get('orders')
        .value()
        .filter((order) => String(order.userId) === String(req.auth.user.id))
      if (req.path === '/orders') return res.json(ownOrders)
      const order = ownOrders.find((item) => String(item.id) === req.path.split('/')[2])
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
