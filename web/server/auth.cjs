const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const CANTEENS = ['第一食堂', '第二食堂', '风味食堂']
const SPICES = ['none', 'mild', 'medium', 'hot']
const CUISINES = ['家常小炒', '面食米线', '轻食蔬菜', '风味套餐']
const INGREDIENTS = ['香菜', '葱', '姜', '蒜', '花生', '洋葱']
const MEAL_TIMES = ['11:00–11:30', '11:30–12:00', '12:00–12:30', '12:30–13:00']
const DEMO_PASSWORD = 'Shiguang@2026'

function passwordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') }
}

function matchesPassword(password, record) {
  if (typeof password !== 'string' || password.length > 128 || !record) return false
  const actual = crypto.scryptSync(password, record.salt, 64)
  const expected = Buffer.from(record.hash, 'hex')
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

function publicUser(user) {
  if (!user) return null
  const {
    id,
    account,
    name,
    displayName,
    studentId,
    role,
    stallId,
    phone,
    email,
    canteen,
    avatarTone,
    preferences,
    lastLoginAt,
  } = user
  return {
    id,
    account,
    name,
    displayName,
    studentId,
    role,
    ...(stallId ? { stallId } : {}),
    phone,
    email,
    canteen,
    avatarTone,
    preferences,
    lastLoginAt,
  }
}

function registerAuth(server, db, options = {}) {
  const sessions = new Map()
  const clock = options.clock || Date.now
  const credentialFile = path.resolve(options.credentialFile)
  let credentials = fs.existsSync(credentialFile)
    ? JSON.parse(fs.readFileSync(credentialFile, 'utf8'))
    : {}
  for (const user of db.get('users').value()) {
    if (!credentials[user.id]) credentials[user.id] = passwordRecord(DEMO_PASSWORD)
  }
  const persistCredentials = () =>
    fs.writeFileSync(credentialFile, JSON.stringify(credentials, null, 2), { mode: 0o600 })
  persistCredentials()

  function error(res, status, message, code) {
    return res.status(status).json({ message, code })
  }
  function sessionFor(req) {
    const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1]
    const session = sessions.get(token)
    if (!session || session.expiresAt <= clock()) {
      if (token) sessions.delete(token)
      return null
    }
    const user = db.get('users').find({ id: session.userId }).value()
    return user ? { token, session, user } : null
  }
  function requireSession(req, res, next) {
    const current = sessionFor(req)
    if (!current) return error(res, 401, '登录已失效，请重新登录。', 'SESSION_EXPIRED')
    req.auth = current
    res.setHeader('Cache-Control', 'no-store')
    return next()
  }
  function revokeUserSessions(userId) {
    for (const [key, session] of sessions) if (session.userId === userId) sessions.delete(key)
  }

  server.post('/auth/login', (req, res) => {
    const { account, password, role, remember } = req.body || {}
    if (typeof account !== 'string' || !['student', 'merchant'].includes(role))
      return error(res, 400, '请填写账号并选择登录身份。', 'INVALID_LOGIN')
    const user = db.get('users').find({ account: account.trim() }).value()
    if (!user || !matchesPassword(password, credentials[user.id]) || user.role !== role)
      return error(res, 401, '账号、密码或登录身份不正确，请核对后重试。', 'INVALID_CREDENTIALS')
    for (const [key, entry] of sessions) if (entry.expiresAt <= clock()) sessions.delete(key)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt =
      clock() + (options.sessionTtlMs || (remember ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000))
    const lastLoginAt = new Date(clock()).toISOString()
    db.get('users').find({ id: user.id }).assign({ lastLoginAt }).write()
    sessions.set(token, { userId: user.id, expiresAt })
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ user: publicUser({ ...user, lastLoginAt }), token, expiresAt })
  })
  server.get('/auth/session', requireSession, (req, res) =>
    res.json({ user: publicUser(req.auth.user), expiresAt: req.auth.session.expiresAt }),
  )
  server.delete('/auth/session', requireSession, (req, res) => {
    sessions.delete(req.auth.token)
    res.sendStatus(204)
  })
  server.delete('/auth/sessions', requireSession, (req, res) => {
    revokeUserSessions(req.auth.user.id)
    res.sendStatus(204)
  })
  server.get('/me', requireSession, (req, res) => res.json(publicUser(req.auth.user)))
  server.get('/me/summary', requireSession, (req, res) => {
    const orders = db
      .get('orders')
      .value()
      .filter((order) => String(order.userId) === String(req.auth.user.id))
    return res.json({
      totalOrders: orders.length,
      pendingOrders: orders.filter((order) => order.status === 'pending').length,
      completedOrders: orders.filter((order) => order.status === 'completed').length,
      recentOrders: orders
        .slice(-3)
        .reverse()
        .map(({ id, status, total, createdAt }) => ({ id, status, total, createdAt })),
    })
  })
  server.put('/me/profile', requireSession, (req, res) => {
    const body = req.body || {}
    const allowed = ['displayName', 'phone', 'email', 'canteen', 'avatarTone']
    if (Object.keys(body).some((key) => !allowed.includes(key)))
      return error(res, 422, '只允许修改个人资料字段。', 'INVALID_FIELDS')
    const { displayName, phone = '', email = '', canteen, avatarTone } = body
    if (typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 20)
      return error(res, 422, '昵称需为 1–20 个字符。', 'INVALID_NAME')
    if (typeof phone !== 'string' || (phone && !/^1[3-9]\d{9}$/.test(phone)))
      return error(res, 422, '请填写有效的手机号，或留空。', 'INVALID_PHONE')
    if (
      typeof email !== 'string' ||
      email.length > 100 ||
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
      return error(res, 422, '请填写有效的邮箱，或留空。', 'INVALID_EMAIL')
    if (!CANTEENS.includes(canteen) || !['leaf', 'peach', 'sky', 'oat'].includes(avatarTone))
      return error(res, 422, '请选择有效的食堂和头像颜色。', 'INVALID_PROFILE')
    db.get('users')
      .find({ id: req.auth.user.id })
      .assign({ displayName: displayName.trim(), phone, email, canteen, avatarTone })
      .write()
    return res.json(publicUser(db.get('users').find({ id: req.auth.user.id }).value()))
  })
  server.put('/me/preferences', requireSession, (req, res) => {
    const { spice, cuisines, avoidIngredients, mealTime } = req.body || {}
    const validList = (items, options) =>
      Array.isArray(items) &&
      items.length <= options.length &&
      new Set(items).size === items.length &&
      items.every((item) => options.includes(item))
    if (
      !SPICES.includes(spice) ||
      !MEAL_TIMES.includes(mealTime) ||
      !validList(cuisines, CUISINES) ||
      !validList(avoidIngredients, INGREDIENTS)
    )
      return error(res, 422, '用餐偏好不完整，请重新选择。', 'INVALID_PREFERENCES')
    db.get('users')
      .find({ id: req.auth.user.id })
      .assign({ preferences: { spice, cuisines, avoidIngredients, mealTime } })
      .write()
    return res.json(publicUser(db.get('users').find({ id: req.auth.user.id }).value()))
  })
  server.put('/me/password', requireSession, (req, res) => {
    const { currentPassword, newPassword } = req.body || {}
    if (!matchesPassword(currentPassword, credentials[req.auth.user.id]))
      return error(res, 422, '当前密码不正确。', 'INVALID_PASSWORD')
    if (
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      newPassword.length > 72 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      newPassword === currentPassword
    )
      return error(
        res,
        422,
        '新密码需为 8–72 位，包含字母和数字，且不同于原密码。',
        'WEAK_PASSWORD',
      )
    credentials[req.auth.user.id] = passwordRecord(newPassword)
    persistCredentials()
    revokeUserSessions(req.auth.user.id)
    return res.json({ message: '密码已更新，请使用新密码登录。' })
  })
  return { requireSession, publicUser }
}

module.exports = { registerAuth, publicUser }
