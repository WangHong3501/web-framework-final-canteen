import http from './http'

export const accountApi = {
  profile: () => http.get('/me').then((res) => res.data),
  summary: () => http.get('/me/summary').then((res) => res.data),
  saveProfile: (profile) => http.put('/me/profile', profile),
  savePreferences: (preferences) => http.put('/me/preferences', preferences),
  changePassword: (data) => http.put('/me/password', data).then((res) => res.data),
}
