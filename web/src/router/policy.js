export const DEFAULT_DESTINATION = '/menu'

export function homeDestination(role) {
  return role === 'merchant' ? '/orders' : DEFAULT_DESTINATION
}

export function safeDestination(value, role) {
  const fallback = homeDestination(role)
  if (typeof value !== 'string' || value.length > 1000) return fallback
  let decoded
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return fallback
  }
  if (/[\\\u0000-\u001f]/.test(decoded) || decoded.startsWith('//')) return fallback
  if (
    !/^\/(?:center(?:\/|\?|$)|menu(?:\?|$)|cart(?:\?|$)|dish\/|orders(?:\?|$)|order\/|mobile(?:\?|$)|admin\/(?:overview|dishes)(?:\?|$))/.test(
      decoded,
    )
  )
    return fallback
  if (decoded.split('?')[0].split('/').includes('..')) return fallback
  return value
}

export function routeAllowsRole(records, role) {
  return records.every((record) => !record.meta?.roles || record.meta.roles.includes(role))
}
