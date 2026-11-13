import axios from 'axios'
import { storedToken } from '@/utils/auth-storage'

const http = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api', timeout: 10000 })
http.interceptors.request.use((config) => {
  const token = storedToken()
  if (token && config.url !== '/auth/login') config.headers.Authorization = `Bearer ${token}`
  return config
})
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/auth/login')
      window.dispatchEvent(new CustomEvent('shiguang:unauthorized'))
    return Promise.reject(error)
  },
)

export function requestMessage(error, fallback = '操作未完成，请稍后重试。') {
  if (!error.response) return '暂时无法连接食堂服务，请检查网络后重试。'
  return error.response.data?.message || fallback
}
export default http
