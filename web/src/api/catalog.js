import http from './http'

/** 菜单/档口只读目录接口 */
export const catalogApi = {
  dishes: (params) => http.get('/dishes', { params }).then((res) => res.data),
  dish: (id) => http.get(`/dishes/${id}`).then((res) => res.data),
  stalls: () => http.get('/stalls').then((res) => res.data),
}
