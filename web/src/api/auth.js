import http from './http'

export const authApi = {
  login: (credentials) => http.post('/auth/login', credentials).then((res) => res.data),
  session: () => http.get('/auth/session').then((res) => res.data),
  logout: () => http.delete('/auth/session'),
  logoutAll: () => http.delete('/auth/sessions'),
}
