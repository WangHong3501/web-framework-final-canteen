import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const root = path.resolve('dist')
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory()
      ? walk(file)
      : [
          {
            path: path.relative(root, file).replaceAll('\\', '/'),
            bytes: fs.statSync(file).size,
            gzipBytes: gzipSync(fs.readFileSync(file)).length,
          },
        ]
  })
}
const files = walk(root)
const javascript = files.filter((file) => file.path.endsWith('.js'))
const report = {
  measuredAt: new Date().toISOString(),
  buildElapsedMs: Number(process.argv[2]) || null,
  totalFiles: files.length,
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  javascriptFiles: javascript.length,
  javascriptBytes: javascript.reduce((sum, file) => sum + file.bytes, 0),
  javascriptGzipBytes: javascript.reduce((sum, file) => sum + file.gzipBytes, 0),
  largestJavascript: [...javascript].sort((a, b) => b.bytes - a.bytes)[0],
  cssFiles: files.filter((file) => file.path.endsWith('.css')),
  pageChunks: javascript.filter((file) => /(?:View|Layout)-/.test(file.path)),
  images: files.filter((file) => /\.(?:jpg|png|webp|svg)$/.test(file.path)),
}
fs.mkdirSync('.local', { recursive: true })
fs.writeFileSync('.local/build-metrics.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
