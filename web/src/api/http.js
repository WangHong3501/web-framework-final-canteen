import { computed, reactive } from 'vue'
import axios from 'axios'
import { storedToken } from '@/utils/auth-storage'
import { normalizeError, requestMessage } from './errors'

const DEFAULT_TIMEOUT = 10000
const rawTimeout = Number(import.meta.env.VITE_API_TIMEOUT || DEFAULT_TIMEOUT)
const timeout =
  Number.isFinite(rawTimeout) && rawTimeout >= 1000 ? Math.min(rawTimeout, 60000) : DEFAULT_TIMEOUT

/**
 * 全局请求状态：页面保留自己的 loading（控制局部骨架屏），
 * 这里额外提供跨页面的 pending 计数，便于顶栏或调试面板显示“请求中”。
 */
export const requestState = reactive({ pending: 0, lastError: null })
export const pendingCount = computed(() => requestState.pending)
export const isRequesting = computed(() => requestState.pending > 0)

export function resetRequestState() {
  requestState.pending = 0
  requestState.lastError = null
}

function isLoginRequest(url) {
  return String(url || '').replace(/\/+$/, '') === '/auth/login'
}

function startRequest(config) {
  config.__shiguangTracked = true
  requestState.pending += 1
  return config
}

function finishRequest(config) {
  if (!config?.__shiguangTracked) return
  config.__shiguangTracked = false
  requestState.pending = Math.max(0, requestState.pending - 1)
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = storedToken()
  if (token && !isLoginRequest(config.url)) config.headers.Authorization = `Bearer ${token}`
  return startRequest(config)
})

http.interceptors.response.use(
  (response) => {
    finishRequest(response.config)
    return response
  },
  (error) => {
    finishRequest(error?.config)
    const normalized = normalizeError(error)
    error.normalized = normalized
    requestState.lastError = normalized
    if (
      normalized.kind === 'auth' &&
      !isLoginRequest(error?.config?.url) &&
      typeof window !== 'undefined'
    )
      window.dispatchEvent(new CustomEvent('shiguang:unauthorized'))
    return Promise.reject(error)
  },
)

export { requestMessage }
export default http
