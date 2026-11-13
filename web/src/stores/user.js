import { defineStore } from 'pinia'
import { authApi } from '@/api/auth'
import { accountApi } from '@/api/account'
import { AUTH_STORAGE_KEY, authStorage, clearAuthStorage } from '@/utils/auth-storage'

let validationRequest = null

export const useUserStore = defineStore('user', {
  state: () => ({ user: null, token: '', expiresAt: 0, remember: false, verifiedAt: 0 }),
  getters: {
    isAuthenticated: (state) =>
      !!(state.token && state.user && Number(state.expiresAt) > Date.now()),
    displayName: (state) => state.user?.displayName || state.user?.name || '食光同学',
    isMerchant: (state) => state.user?.role === 'merchant',
    profileCompletion: (state) => {
      const user = state.user
      if (!user) return 0
      return Math.round(
        ([user.displayName, user.canteen, user.avatarTone, user.phone, user.email].filter(Boolean)
          .length /
          5) *
          100,
      )
    },
  },
  actions: {
    async login(credentials) {
      const result = await authApi.login(credentials)
      this.$patch({
        user: result.user,
        token: result.token,
        expiresAt: result.expiresAt,
        remember: !!credentials.remember,
        verifiedAt: Date.now(),
      })
      // Ensure the first authenticated request also works if a custom persistence subscriber is deferred.
      this.$persist()
      return result.user
    },
    clearSession() {
      this.$reset()
      clearAuthStorage()
      validationRequest = null
    },
    async verifySession(force = false) {
      if (!this.token || !this.user || Number(this.expiresAt) <= Date.now()) {
        this.clearSession()
        return false
      }
      if (!force && Date.now() - this.verifiedAt < 30000) return true
      if (validationRequest?.token === this.token) return validationRequest.promise
      const token = this.token
      const promise = authApi
        .session()
        .then((result) => {
          if (this.token !== token) return false
          this.$patch({ user: result.user, expiresAt: result.expiresAt, verifiedAt: Date.now() })
          return true
        })
        .catch((error) => {
          if (error.response?.status === 401) {
            this.clearSession()
            return false
          }
          throw error
        })
        .finally(() => {
          if (validationRequest?.token === token) validationRequest = null
        })
      validationRequest = { token, promise }
      return promise
    },
    async refreshProfile() {
      const user = await accountApi.profile()
      this.user = user
      return user
    },
    async saveProfile(profile) {
      await accountApi.saveProfile(profile)
      return this.refreshProfile()
    },
    async savePreferences(preferences) {
      await accountApi.savePreferences(preferences)
      return this.refreshProfile()
    },
    async logout(all = false) {
      try {
        if (this.token) await (all ? authApi.logoutAll() : authApi.logout())
      } finally {
        this.clearSession()
      }
    },
  },
  persist: {
    key: AUTH_STORAGE_KEY,
    storage: authStorage,
    pick: ['user', 'token', 'expiresAt', 'remember'],
  },
})
