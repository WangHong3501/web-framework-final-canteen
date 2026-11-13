const fs = require('node:fs')
const path = require('node:path')

function prepareDatabase(filePath) {
  const seed = path.resolve(__dirname, '../db.json')
  const runtime = path.resolve(filePath || path.join(__dirname, '../.local/db.runtime.json'))
  fs.mkdirSync(path.dirname(runtime), { recursive: true })
  if (!fs.existsSync(runtime)) fs.copyFileSync(seed, runtime)
  return runtime
}

module.exports = { prepareDatabase }
