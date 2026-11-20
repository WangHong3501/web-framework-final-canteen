import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeError,
  requestMessage,
  isTimeout,
  isCanceled,
  isNetworkError,
  isValidationError,
} from '../../src/api/errors.js'

function httpError(status, data = {}, url = '/dishes') {
  return { response: { status, data }, config: { url } }
}

test('超时与取消优先于断网，不误报为网络异常', () => {
  const timeout = { code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' }
  assert.equal(isTimeout(timeout), true)
  assert.equal(isNetworkError(timeout), false)
  assert.deepEqual(
    { kind: normalizeError(timeout).kind, code: normalizeError(timeout).code },
    { kind: 'timeout', code: 'TIMEOUT' },
  )
  assert.match(normalizeError(timeout).message, /超时/)

  const canceled = { code: 'ERR_CANCELED', name: 'CanceledError' }
  assert.equal(isCanceled(canceled), true)
  assert.equal(normalizeError(canceled).kind, 'canceled')
})

test('没有响应且不是超时/取消时识别为网络断开', () => {
  const error = { code: 'ERR_NETWORK', message: 'Network Error' }
  assert.equal(isNetworkError(error), true)
  const normalized = normalizeError(error)
  assert.equal(normalized.kind, 'network')
  assert.equal(normalized.status, 0)
  assert.match(normalized.message, /无法连接/)
})

test('401 使用服务端 code/message，并归为 auth', () => {
  const normalized = normalizeError(
    httpError(401, { code: 'SESSION_EXPIRED', message: '登录已失效，请重新登录。' }),
  )
  assert.equal(normalized.kind, 'auth')
  assert.equal(normalized.status, 401)
  assert.equal(normalized.code, 'SESSION_EXPIRED')
  assert.equal(normalized.message, '登录已失效，请重新登录。')
})

test('403/404/422/500 有稳定默认文案', () => {
  assert.equal(normalizeError(httpError(403)).kind, 'forbidden')
  assert.match(normalizeError(httpError(403)).message, /权限/)
  assert.equal(normalizeError(httpError(404)).kind, 'not-found')
  assert.match(normalizeError(httpError(404)).message, /不存在/)
  assert.equal(normalizeError(httpError(422)).kind, 'validation')
  assert.equal(isValidationError(httpError(422)), true)
  assert.equal(normalizeError(httpError(500)).kind, 'server')
  assert.match(normalizeError(httpError(500)).message, /暂时/)
})

test('优先展示服务端业务文案与字段错误 code', () => {
  const normalized = normalizeError(
    httpError(422, { code: 'INVALID_FIELDS', message: '价格不合法', fields: ['price'] }),
  )
  assert.equal(normalized.code, 'INVALID_FIELDS')
  assert.equal(normalized.message, '价格不合法')
  assert.equal(requestMessage(httpError(422, { message: '数量不正确' })), '数量不正确')
})

test('未知状态码与空错误回退到调用方文案', () => {
  const normalized = normalizeError(httpError(418), '自定义失败提示')
  assert.equal(normalized.status, 418)
  assert.equal(normalized.code, 'HTTP_418')
  assert.equal(normalized.message, '自定义失败提示')
  assert.equal(requestMessage(null, '兜底提示'), '兜底提示')
  assert.equal(requestMessage(undefined), '操作未完成，请稍后重试。')
})
