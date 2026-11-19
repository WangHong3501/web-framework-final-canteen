import http from './http'

/** 订单接口：列表 / 详情 / 下单 / 状态流转，全部带 catch 由调用方兜底 */
export const ordersApi = {
  list: () => http.get('/orders').then((res) => res.data),
  detail: (id) => http.get(`/orders/${id}`).then((res) => res.data),
  create: (payload) => http.post('/orders', payload).then((res) => res.data),
  update: (id, payload) => http.put(`/orders/${id}`, payload).then((res) => res.data),
  confirm: (id) => http.put(`/orders/${id}`, { action: 'confirm' }).then((res) => res.data),
  advance: (id) => http.put(`/orders/${id}`, { action: 'next' }).then((res) => res.data),
}
