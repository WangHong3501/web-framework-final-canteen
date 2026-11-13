export const DEFAULT_DESTINATION = '/center/overview'

export function safeDestination(value) {
  if (typeof value !== 'string' || value.length > 1000) return DEFAULT_DESTINATION
  let decoded
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return DEFAULT_DESTINATION
  }
  if (/[\\\u0000-\u001f]/.test(decoded) || decoded.startsWith('//')) return DEFAULT_DESTINATION
  if (!/^\/(?:center(?:\/|\?|$)|menu(?:\?|$)|orders(?:\?|$)|admin\/dishes(?:\?|$))/.test(decoded))
    return DEFAULT_DESTINATION
  if (decoded.split('?')[0].split('/').includes('..')) return DEFAULT_DESTINATION
  return value
}

export function routeAllowsRole(records, role) {
  return records.every((record) => !record.meta?.roles || record.meta.roles.includes(role))
}
