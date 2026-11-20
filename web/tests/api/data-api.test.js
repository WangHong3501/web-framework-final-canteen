import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { startApi, TEST_MERCHANT, TEST_STUDENT } from './helpers/api-harness.mjs'

let api
let student
let merchant
let secondStudent

before(async () => {
  api = await startApi({
    mutateSeed(seed) {
      seed.orders = []
      seed.users.push({
        id: 'student-2',
        account: '32605150602',
        name: '测试同学',
        displayName: '测试同学',
        studentId: '32605150602',
        role: 'student',
        preferences: { spice: 'mild', cuisines: [], avoidIngredients: [], mealTime: '' },
      })
    },
  })
  student = await api.login(TEST_STUDENT)
  merchant = await api.login(TEST_MERCHANT)
  secondStudent = await api.login({ account: '32605150602', role: 'student' })
})

after(async () => {
  await api?.close()
})

async function createOrder(items, extra = {}) {
  const response = await api.request('/orders', {
    method: 'POST',
    token: student,
    body: { items, meal: 'lunch', remark: '集成测试', ...extra },
  })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}

test('未登录不能读取任何业务目录', async () => {
  assert.equal((await api.request('/dishes')).status, 401)
  assert.equal((await api.request('/stalls')).status, 401)
  assert.equal((await api.request('/orders')).status, 401)
})

test('登录后可读菜品与档口，字段和枚举保持种子约定', async () => {
  const dishes = await api.request('/dishes', { token: student })
  assert.equal(dishes.status, 200)
  assert.equal(dishes.body.length, 12)
  for (const dish of dishes.body) {
    assert.ok(dish.id && dish.name && dish.stallId)
    assert.ok(['success', 'warning', 'danger'].includes(dish.status))
    assert.ok(['breakfast', 'lunch', 'dinner', 'night'].includes(dish.meal))
  }
  const detail = await api.request('/dishes/dish-01', { token: student })
  assert.equal(detail.status, 200)
  assert.equal(detail.body.name, '招牌红烧肉饭')

  const stalls = await api.request('/stalls', { token: student })
  assert.equal(stalls.status, 200)
  assert.equal(stalls.body.length, 4)
  assert.equal(stalls.body[0].window, 'A 窗口')
})

test('商家新增菜品只会写入本档口和托管字段', async () => {
  const response = await api.request('/dishes', {
    method: 'POST',
    token: merchant,
    body: { name: '  测试小炒  ', price: 12.5, category: '家常小炒', meal: 'lunch', desc: '集成测试' },
  })
  assert.equal(response.status, 201)
  const dish = response.body
  assert.match(dish.id, /^dish-\d{2}$/)
  assert.equal(dish.name, '测试小炒')
  assert.equal(dish.stallId, 'stall-1')
  assert.equal(dish.stall, '青禾小厨')
  assert.equal(dish.rating, 0)
  assert.equal(dish.sales, 0)
  assert.equal(dish.status, 'success')

  const read = await api.request(`/dishes/${dish.id}`, { token: student })
  assert.equal(read.status, 200)
  assert.equal(read.body.price, 12.5)
})

test('菜品写接口拒绝未知字段、非法枚举和跨档口新增', async () => {
  const unknown = await api.request('/dishes', {
    method: 'POST',
    token: merchant,
    body: { name: '未知字段菜', price: 10, hack: true },
  })
  assert.equal(unknown.status, 422)
  assert.equal(unknown.body.code, 'INVALID_FIELDS')
  assert.ok(unknown.body.fields.includes('hack'))

  const price = await api.request('/dishes', {
    method: 'POST',
    token: merchant,
    body: { name: '零元菜', price: 0 },
  })
  assert.equal(price.status, 422)
  assert.ok(price.body.fields.includes('price'))

  const category = await api.request('/dishes', {
    method: 'POST',
    token: merchant,
    body: { name: '甜品', price: 10, category: '甜品' },
  })
  assert.equal(category.status, 422)
  assert.ok(category.body.fields.includes('category'))

  const crossStall = await api.request('/dishes', {
    method: 'POST',
    token: merchant,
    body: { name: '跨档口菜', price: 10, stallId: 'stall-2' },
  })
  assert.equal(crossStall.status, 403)
})

test('商家不能改删其他档口的菜品', async () => {
  assert.equal(
    (await api.request('/dishes/dish-03', { method: 'PUT', token: merchant, body: { price: 19.9 } }))
      .status,
    403,
  )
  assert.equal(
    (await api.request('/dishes/dish-03', { method: 'DELETE', token: merchant })).status,
    403,
  )
})

test('商家可更新本档口菜品，id/销量/评分不可篡改，删除后 404', async () => {
  const created = await api.request('/dishes', {
    method: 'POST',
    token: merchant,
    body: { name: '待更新菜品', price: 10, category: '面食米线', meal: 'dinner' },
  })
  const id = created.body.id

  const changeId = await api.request(`/dishes/${id}`, {
    method: 'PUT',
    token: merchant,
    body: { id: 'dish-99' },
  })
  assert.equal(changeId.status, 422)

  const move = await api.request(`/dishes/${id}`, {
    method: 'PUT',
    token: merchant,
    body: { stallId: 'stall-2' },
  })
  assert.equal(move.status, 403)

  const updated = await api.request(`/dishes/${id}`, {
    method: 'PUT',
    token: merchant,
    body: { price: 13, originalPrice: 15, status: 'warning', sales: 999, rating: 5 },
  })
  assert.equal(updated.status, 200)
  assert.equal(updated.body.price, 13)
  assert.equal(updated.body.originalPrice, 15)
  assert.equal(updated.body.status, 'warning')
  assert.equal(updated.body.sales, 0)
  assert.equal(updated.body.rating, 0)

  const patched = await api.request(`/dishes/${id}`, {
    method: 'PATCH',
    token: merchant,
    body: { desc: '窗口现炒' },
  })
  assert.equal(patched.status, 200)
  assert.equal(patched.body.desc, '窗口现炒')

  assert.equal((await api.request(`/dishes/${id}`, { method: 'DELETE', token: merchant })).status, 204)
  assert.equal((await api.request(`/dishes/${id}`, { token: student })).status, 404)
})

test('学生不能写菜品或档口，档口目录只读', async () => {
  const create = await api.request('/dishes', {
    method: 'POST',
    token: student,
    body: { name: '学生菜', price: 10 },
  })
  assert.equal(create.status, 403)
  assert.equal(
    (await api.request('/dishes/dish-01', { method: 'PUT', token: student, body: { price: 1 } }))
      .status,
    403,
  )
  assert.equal((await api.request('/dishes/dish-01', { method: 'DELETE', token: student })).status, 403)
  assert.equal(
    (await api.request('/stalls', { method: 'POST', token: merchant, body: { name: '私开档口' } }))
      .status,
    403,
  )
  assert.equal((await api.request('/stalls/stall-1', { token: student })).status, 200)
})

test('下单时服务端按菜品现价核价并生成取餐信息', async () => {
  const order = await createOrder(
    [
      { dishId: 'dish-01', qty: 2 },
      { dishId: 'dish-05', qty: 1 },
    ],
    { total: 0.01, stallId: 'stall-9', remark: ' 少辣，米饭多一点 ' },
  )
  assert.equal(order.total, 48)
  assert.equal(order.status, 'preparing')
  assert.match(order.pickupCode, /^\d{4}$/)
  assert.equal(order.window, '青禾小厨 · A 窗口')
  assert.equal(order.stallId, 'stall-1')
  assert.equal(order.userId, 'student-1')
  assert.equal(order.remark, '少辣，米饭多一点')
  assert.equal(order.items[0].price, 18)
})

test('订单明细拒绝重复菜品、超量、夹带字段与未知顶层字段', async () => {
  const duplicate = await api.request('/orders', {
    method: 'POST',
    token: student,
    body: { items: [{ dishId: 'dish-01', qty: 1 }, { dishId: 'dish-01', qty: 2 }] },
  })
  assert.equal(duplicate.status, 422)
  assert.equal(duplicate.body.code, 'INVALID_ITEMS')

  const tooMany = await api.request('/orders', {
    method: 'POST',
    token: student,
    body: { items: [{ dishId: 'dish-01', qty: 21 }] },
  })
  assert.equal(tooMany.status, 422)

  const extraItem = await api.request('/orders', {
    method: 'POST',
    token: student,
    body: { items: [{ dishId: 'dish-01', qty: 1, price: 0.01 }] },
  })
  assert.equal(extraItem.status, 422)
  assert.ok(extraItem.body.fields.includes('price'))

  const extraTop = await api.request('/orders', {
    method: 'POST',
    token: student,
    body: { items: [{ dishId: 'dish-01', qty: 1 }], userId: 'student-2' },
  })
  assert.equal(extraTop.status, 422)
  assert.equal(extraTop.body.code, 'INVALID_FIELDS')
})

test('售罄菜品和跨档口订单在落库前被拦截', async () => {
  const soldOut = await api.request('/orders', {
    method: 'POST',
    token: student,
    body: { items: [{ dishId: 'dish-11', qty: 1 }] },
  })
  assert.equal(soldOut.status, 422)
  assert.equal(soldOut.body.code, 'DISH_SOLD_OUT')

  const mixed = await api.request('/orders', {
    method: 'POST',
    token: student,
    body: {
      items: [
        { dishId: 'dish-01', qty: 1 },
        { dishId: 'dish-03', qty: 1 },
      ],
    },
  })
  assert.equal(mixed.status, 422)
  assert.equal(mixed.body.code, 'MIXED_STALLS')
})

test('订单可见性按角色与本人隔离，他人订单返回 404', async () => {
  const order = await createOrder([{ dishId: 'dish-02', qty: 1 }])

  const mine = await api.request('/orders', { token: student })
  assert.equal(mine.status, 200)
  assert.ok(mine.body.every((item) => item.userId === 'student-1'))
  assert.ok(mine.body.some((item) => item.id === order.id))

  const other = await api.request('/orders', { token: secondStudent })
  assert.equal(other.status, 200)
  assert.equal(other.body.length, 0)
  assert.equal((await api.request(`/orders/${order.id}`, { token: secondStudent })).status, 404)

  const all = await api.request('/orders', { token: merchant })
  assert.equal(all.status, 200)
  assert.ok(all.body.some((item) => item.id === order.id))
})

test('商家推进本档口订单，学生在取餐后确认完成', async () => {
  const order = await createOrder([{ dishId: 'dish-02', qty: 1 }])

  const advanced = await api.request(`/orders/${order.id}`, {
    method: 'PUT',
    token: merchant,
    body: { action: 'next' },
  })
  assert.equal(advanced.status, 200)
  assert.equal(advanced.body.status, 'ready')

  const notOwner = await api.request(`/orders/${order.id}`, {
    method: 'PUT',
    token: secondStudent,
    body: { action: 'confirm' },
  })
  assert.equal(notOwner.status, 403)

  const confirmed = await api.request(`/orders/${order.id}`, {
    method: 'PUT',
    token: student,
    body: { action: 'confirm' },
  })
  assert.equal(confirmed.status, 200)
  assert.equal(confirmed.body.status, 'completed')

  assert.equal(
    (await api.request(`/orders/${order.id}`, { method: 'PUT', token: student, body: { action: 'next' } }))
      .status,
    403,
  )
  assert.equal(
    (await api.request(`/orders/${order.id}`, { method: 'PUT', token: merchant, body: { action: 'confirm' } }))
      .status,
    422,
  )
})

test('商家不能推进其他档口的订单', async () => {
  const order = await createOrder([{ dishId: 'dish-03', qty: 1 }])
  const response = await api.request(`/orders/${order.id}`, {
    method: 'PUT',
    token: merchant,
    body: { action: 'next' },
  })
  assert.equal(response.status, 403)
})

test('非法 JSON、未知接口、内部资源与不支持的方法返回统一错误', async () => {
  const badJson = await api.request('/dishes', {
    method: 'POST',
    token: merchant,
    rawBody: '{',
  })
  assert.equal(badJson.status, 400)
  assert.equal(badJson.body.code, 'INVALID_JSON')

  assert.equal((await api.request('/unknown', { token: merchant })).status, 404)
  assert.equal((await api.request('/users', { token: merchant })).status, 403)
  assert.equal((await api.request('/orders', { method: 'DELETE', token: merchant })).status, 405)
  assert.equal((await api.request('/dishes/not-exist', { token: student })).status, 404)
})

test('目录查询参数可过滤，非法枚举返回 422', async () => {
  const breakfast = await api.request('/dishes?meal=breakfast', { token: student })
  assert.equal(breakfast.status, 200)
  assert.ok(breakfast.body.length > 0)
  assert.ok(breakfast.body.every((dish) => dish.meal === 'breakfast'))

  const stall = await api.request('/dishes?stallId=stall-2', { token: student })
  assert.ok(stall.body.every((dish) => dish.stallId === 'stall-2'))

  const search = await api.request(`/dishes?q=${encodeURIComponent('拉面')}`, { token: student })
  assert.ok(search.body.some((dish) => dish.name.includes('拉面')))

  assert.equal((await api.request('/dishes?meal=brunch', { token: student })).status, 422)
  assert.equal((await api.request('/orders?status=unknown', { token: student })).status, 422)
})
