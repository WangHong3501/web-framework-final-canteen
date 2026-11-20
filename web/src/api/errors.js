/**
 * Axios 错误的统一归一化。这里保持纯函数，不依赖浏览器或 Vue，
 * 便于在 Node 测试里直接覆盖超时、断网、401/403/404/422 等分支。
 */
export const NETWORK_MESSAGE = '暂时无法连接食堂服务，请检查网络后重试。'
export const TIMEOUT_MESSAGE = '请求超时，请检查网络后重试。'
export const CANCELED_MESSAGE = '请求已取消。'
export const FALLBACK_MESSAGE = '操作未完成，请稍后重试。'

const STATUS_MESSAGES = {
  400: '请求内容格式不正确。',
  401: '登录已失效，请重新登录。',
  403: '没有权限执行这个操作。',
  404: '请求的内容不存在或已被删除。',
  409: '数据已被更新，请刷新后重试。',
  413: '提交内容过大，请精简后重试。',
  422: '提交内容不符合要求。',
  429: '操作太频繁，请稍后再试。',
  500: '服务暂时无法完成请求，请稍后重试。',
  502: '服务暂时不可用，请稍后重试。',
  503: '服务暂时不可用，请稍后重试。',
  504: '服务响应超时，请稍后重试。',
}

export function isCanceled(error) {
  return (
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError' ||
    error?.name === 'AbortError'
  )
}

export function isTimeout(error) {
  return (
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT' ||
    /timeout/i.test(String(error?.message || ''))
  )
}

export function isNetworkError(error) {
  return Boolean(error) && !error.response && !isCanceled(error) && !isTimeout(error)
}

function statusKind(status) {
  if (status === 401) return 'auth'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not-found'
  if (status === 409) return 'conflict'
  if (status === 413) return 'payload-too-large'
  if (status === 422 || status === 400) return 'validation'
  if (status === 429) return 'rate-limit'
  if (status >= 500) return 'server'
  return 'client'
}

/**
 * 返回 { kind, status, code, message, requestId }。
 * 优先使用服务端 { message, code }；没有响应时区分取消、超时与断网。
 */
export function normalizeError(error, fallback = FALLBACK_MESSAGE) {
  const safeFallback = typeof fallback === 'string' && fallback ? fallback : FALLBACK_MESSAGE
  if (!error || typeof error !== 'object')
    return { kind: 'unknown', status: 0, code: 'UNKNOWN', message: safeFallback }

  if (isCanceled(error))
    return { kind: 'canceled', status: 0, code: 'CANCELED', message: CANCELED_MESSAGE }

  if (isTimeout(error))
    return { kind: 'timeout', status: 0, code: 'TIMEOUT', message: TIMEOUT_MESSAGE }

  if (!error.response)
    return { kind: 'network', status: 0, code: 'NETWORK_ERROR', message: NETWORK_MESSAGE }

  const status = Number(error.response.status) || 0
  const data = error.response.data
  const code =
    data && typeof data === 'object' && typeof data.code === 'string' && data.code
      ? data.code
      : `HTTP_${status}`
  const message =
    data && typeof data === 'object' && typeof data.message === 'string' && data.message.trim()
      ? data.message
      : STATUS_MESSAGES[status] || safeFallback
  const requestId =
    data && typeof data === 'object' && typeof data.requestId === 'string'
      ? data.requestId
      : undefined

  return { kind: statusKind(status), status, code, message, ...(requestId ? { requestId } : {}) }
}

/** 页面 catch 里统一取可展示文案；保留 fallback 以兼容各页面的原有调用。 */
export function requestMessage(error, fallback = FALLBACK_MESSAGE) {
  return normalizeError(error, fallback).message
}

export function isAuthError(error) {
  return normalizeError(error).kind === 'auth'
}

export function isForbiddenError(error) {
  return normalizeError(error).kind === 'forbidden'
}

export function isNotFoundError(error) {
  return normalizeError(error).kind === 'not-found'
}

export function isValidationError(error) {
  return ['validation', 'payload-too-large'].includes(normalizeError(error).kind)
}
