import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeDestination, routeAllowsRole, DEFAULT_DESTINATION } from '../../src/router/policy.js'

test('登录后保留允许的站内来源与查询参数', () => {
  for (const destination of [
    '/center/profile',
    '/center/security?tab=password',
    '/menu',
    '/orders?status=pending',
    '/admin/dishes',
  ])
    assert.equal(safeDestination(destination), destination)
})
test('外部 URL、协议相对 URL 和反斜线不能成为登录跳转目标', () => {
  for (const value of [
    'https://example.com',
    '//example.com',
    '/%2fexample.com',
    '/\\example.com',
    '/center\\example.com',
    '/center/%0aLocation:https://example.com',
  ])
    assert.equal(safeDestination(value), DEFAULT_DESTINATION)
})
test('无效、未开放和自循环目标回到个人概览', () => {
  for (const value of [
    null,
    undefined,
    [],
    {},
    1,
    '',
    '/login',
    '/forbidden',
    '/unknown',
    '/center/../login',
    '/center/%',
    '/center/' + 'a'.repeat(1001),
  ])
    assert.equal(safeDestination(value), DEFAULT_DESTINATION)
})
test('父子路由权限同时满足才能进入', () => {
  const records = [{ meta: { roles: ['student', 'merchant'] } }, { meta: { roles: ['merchant'] } }]
  assert.equal(routeAllowsRole(records, 'student'), false)
  assert.equal(routeAllowsRole(records, 'merchant'), true)
  assert.equal(routeAllowsRole([{ meta: { requiresAuth: true } }], 'student'), true)
})
