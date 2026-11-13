const KEY = 'shiguang.user.v1'
let memoryToken = ''

function readStorage(storage, key) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}
function removeStorage(storage, key) {
  try {
    storage.removeItem(key)
  } catch {
    /* Storage may be blocked by browser settings. */
  }
}

export const authStorage = {
  getItem(key) {
    const value = readStorage(sessionStorage, key) || readStorage(localStorage, key)
    if (!value) return null
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? value : null
    } catch {
      this.removeItem(key)
      return null
    }
  },
  setItem(key, value) {
    try {
      const parsed = JSON.parse(value)
      memoryToken = typeof parsed.token === 'string' ? parsed.token : ''
      const persistent = parsed.remember === true
      const target = persistent ? localStorage : sessionStorage
      removeStorage(persistent ? sessionStorage : localStorage, key)
      target.setItem(key, value)
    } catch {
      /* An in-memory session remains usable if persistence is unavailable. */
    }
  },
  removeItem(key) {
    memoryToken = ''
    removeStorage(sessionStorage, key)
    removeStorage(localStorage, key)
  },
}

export function storedToken() {
  try {
    const stored = JSON.parse(authStorage.getItem(KEY) || 'null')
    return memoryToken || (stored && typeof stored.token === 'string' ? stored.token : '')
  } catch {
    return ''
  }
}
export function clearAuthStorage() {
  authStorage.removeItem(KEY)
}
export const AUTH_STORAGE_KEY = KEY
