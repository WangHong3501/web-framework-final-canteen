import http from './http'

/**
 * 菜品与档口接口（页面开发 B 维护）
 * 统一复用公共 http 实例，覆盖 GET / POST / PUT / DELETE 四种请求方法。
 */
export const dishesApi = {
  stalls: () => http.get('/stalls').then((response) => response.data),
  list: (params = {}) => http.get('/dishes', { params }).then((response) => response.data),
  get: (id) => http.get(`/dishes/${encodeURIComponent(id)}`).then((response) => response.data),
  create: (payload) => http.post('/dishes', payload).then((response) => response.data),
  update: (id, payload) =>
    http.put(`/dishes/${encodeURIComponent(id)}`, payload).then((response) => response.data),
  remove: (id) =>
    http.delete(`/dishes/${encodeURIComponent(id)}`).then((response) => response.data),
}
