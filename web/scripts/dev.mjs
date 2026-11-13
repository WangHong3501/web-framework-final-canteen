import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const vite = path.resolve(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js')
const children = [
  spawn(process.execPath, ['server/index.cjs'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    windowsHide: true,
  }),
  spawn(process.execPath, [vite, '--host', '127.0.0.1'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    windowsHide: true,
  }),
]
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) if (!child.killed) child.kill()
  process.exitCode = code
}
for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message)
    stop(1)
  })
  child.on('exit', (code) => {
    if (!stopping) stop(code || 0)
  })
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
