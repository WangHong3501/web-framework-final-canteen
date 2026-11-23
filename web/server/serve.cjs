const path = require('node:path')
const fs = require('node:fs')
const jsonServer = require('json-server')
const { createApp } = require('./index.cjs')

function createProductionApp({ dist = path.resolve(__dirname, '../dist'), dbFile } = {}) {
  if (!fs.existsSync(path.join(dist, 'index.html')))
    throw new Error('请先在 web 目录执行 npm run build。')
  const app = jsonServer.create()
  app.use('/api', createApp({ dbFile }))
  app.use((req, res, next) => {
    if (req.path.startsWith('/assets/'))
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    else res.setHeader('Cache-Control', 'no-cache')
    next()
  })
  app.use(jsonServer.defaults({ static: dist, logger: false, noCors: true }))
  return app
}

if (require.main === module) {
  const host = process.env.HOST || '127.0.0.1'
  const port = Number(process.env.PORT || 8080)
  const listener = createProductionApp({ dbFile: process.env.DB_FILE }).listen(port, host, () =>
    console.log(`食光校园 http://${host}:${listener.address().port}/#/login`),
  )
  listener.on('error', (error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
module.exports = { createProductionApp }
