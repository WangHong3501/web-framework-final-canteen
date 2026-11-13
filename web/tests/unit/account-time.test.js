import { test } from 'node:test'
import assert from 'node:assert/strict'
import { campusGreeting } from '../../src/utils/time.js'

for (const [date, text, icon] of [
  ['2026-11-12T17:00:00Z', '夜深了', 'Moon'],
  ['2026-11-13T02:00:00Z', '早上好', 'Sun'],
  ['2026-11-13T04:00:00Z', '中午好', 'Sun'],
  ['2026-11-13T08:00:00Z', '下午好', 'Sun'],
  ['2026-11-13T12:00:00Z', '晚上好', 'Moon'],
])
  test(`上海时区 ${date} 显示${text}，不受执行主机时区或“时”字影响`, () =>
    assert.deepEqual(campusGreeting(new Date(date)), { text, icon }))
