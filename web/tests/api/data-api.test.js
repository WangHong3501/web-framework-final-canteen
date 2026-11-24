import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import database from '../../server/db.cjs'
import { startApi, TEST_MERCHANT, TEST_STUDENT } from './helpers/api-harness.mjs'

let api
let student
let merchant
let secondStudent
const { dishes: seedDishes } = JSON.parse(
  fs.readFileSync(new URL('../../db.json', import.meta.url), 'utf8'),
)

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
  assert.equal(dishes.body.length, seedDishes.length)
  assert.ok(dishes.body.some((dish) => dish.cuisine === '闽菜' && dish.name === '福州荔枝肉'))
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

test('四个档口每个餐次有八道菜，两道优惠，并有余量少和售罄示例', async () => {
  for (const stallId of ['stall-1', 'stall-2', 'stall-3', 'stall-4']) {
    for (const meal of ['breakfast', 'lunch', 'dinner', 'night']) {
      const key = `${stallId}/${meal}`
      const { status, body } = await api.request(`/dishes?stallId=${stallId}&meal=${meal}`, {
        token: student,
      })
      assert.equal(status, 200, key)
      assert.equal(body.length, 8, key)
      assert.ok(
        body.every((dish) => dish.stallId === stallId && dish.meal === meal),
        key,
      )
      const offers = body.filter(
        (dish) => dish.status !== 'danger' && dish.originalPrice > dish.price,
      )
      assert.equal(offers.length, 2, key)
      assert.equal(body.filter((dish) => dish.status === 'warning').length, 1, key)
      const soldOut = body.filter((dish) => dish.status === 'danger')
      assert.ok(soldOut.length >= 1 && soldOut.length <= 2, key)
    }
  }
})

test('商家新增菜品只会写入本档口和托管字段', async () => {
  const response = await api.request('/dishes', {
    method: 'POST',
    token: merchant,
    body: {
      name: '  测试汤羹  ',
      price: 12.5,
      category: '汤羹粥品',
      cuisine: '粤菜',
      meal: 'lunch',
      desc: '集成测试',
    },
  })
  assert.equal(response.status, 201)
  const dish = response.body
  assert.match(dish.id, /^dish-\d{2}$/)
  assert.equal(dish.name, '测试汤羹')
  assert.equal(dish.cuisine, '粤菜')
  assert.equal(dish.category, '汤羹粥品')
  assert.equal(dish.stallId, 'stall-1')
  assert.equal(dish.stall, '青禾小厨')
  assert.equal(dish.rating, 0)
  assert.equal(dish.sales, 0)
  assert.equal(dish.status, 'success')

  const read = await api.request(`/dishes/${dish.id}`, { token: student })
  assert.equal(read.status, 200)
  assert.equal(read.body.price, 12.5)
  assert.equal(read.body.cuisine, '粤菜')
})

test('旧运行库追加新种子菜品，保留历史订单和人工修改的菜品', async () => {
  let orderSnapshot
  const legacy = await startApi({
    mutateSeed(seed) {
      delete seed.catalog
      seed.users = seed.users.filter((user) => user.role !== 'merchant' || user.id === 'merchant-1')
      seed.dishes = seed.dishes.filter(
        (dish) => !dish.id.startsWith('dish-seed-') && dish.id !== 'dish-11',
      )
      for (const dish of seed.dishes) delete dish.cuisine
      seed.dishes[0].price = 15
      seed.dishes.push({ ...seed.dishes[0], id: 'dish-13', name: '档口自建菜品' })
      orderSnapshot = structuredClone(seed.orders)
    },
  })
  try {
    const upgraded = JSON.parse(fs.readFileSync(legacy.dbFile, 'utf8'))
    assert.deepEqual(upgraded.orders, orderSnapshot)
    assert.equal(upgraded.dishes.find((dish) => dish.id === 'dish-01').price, 15)
    assert.equal(upgraded.dishes.find((dish) => dish.id === 'dish-13').name, '档口自建菜品')
    assert.equal(upgraded.dishes.find((dish) => dish.id === 'dish-04').cuisine, '川菜')
    assert.equal(
      upgraded.dishes.some((dish) => dish.id === 'dish-11'),
      false,
    )
    assert.equal(upgraded.dishes.length, seedDishes.length)
    for (const stall of [2, 3, 4]) {
      const token = await legacy.login({ account: `merchant0${stall}`, role: 'merchant' })
      const session = await legacy.request('/auth/session', { token })
      assert.equal(session.body.user.stallId, `stall-${stall}`)
    }
    upgraded.dishes = upgraded.dishes.filter((dish) => dish.id !== 'dish-seed-13')
    fs.writeFileSync(legacy.dbFile, JSON.stringify(upgraded))
    database.prepareDatabase(legacy.dbFile)
    const restarted = JSON.parse(fs.readFileSync(legacy.dbFile, 'utf8'))
    assert.deepEqual(restarted.dishes, upgraded.dishes)
  } finally {
    await legacy.close()
  }
})

test('第 2 版单档口运行库补齐档口与账号，原有菜品和订单保留', async () => {
  let original
  const legacy = await startApi({
    mutateSeed(seed) {
      seed.catalog.revision = 2
      seed.stalls = seed.stalls.filter((stall) => stall.id === 'stall-1')
      seed.users = seed.users.filter(
        (user) => user.role !== 'merchant' || user.stallId === 'stall-1',
      )
      seed.dishes = seed.dishes.filter(
        (dish) => dish.stallId === 'stall-1' && dish.id !== 'dish-11',
      )
      seed.dishes[0].price = 15
      original = structuredClone(seed)
    },
  })
  try {
    const upgraded = JSON.parse(fs.readFileSync(legacy.dbFile, 'utf8'))
    assert.equal(upgraded.stalls.length, 4)
    assert.deepEqual(
      upgraded.dishes.filter((dish) => dish.stallId === 'stall-1'),
      original.dishes,
    )
    assert.deepEqual(upgraded.orders, original.orders)
    for (const stall of [2, 3, 4]) {
      const token = await legacy.login({ account: `merchant0${stall}`, role: 'merchant' })
      const session = await legacy.request('/auth/session', { token })
      const stallId = `stall-${stall}`
      assert.equal(session.body.user.stallId, stallId)
      assert.ok(upgraded.dishes.some((dish) => dish.stallId === stallId))
    }
  } finally {
    await legacy.close()
  }
})

test('第 3 版菜单升级追加新菜，只更新仍使用旧预设的餐次、优惠和库存状态', async () => {
  let orders
  const legacy = await startApi({
    mutateSeed(seed) {
      seed.catalog.revision = 3
      seed.dishes = seed.dishes.filter(
        (dish) => Number(dish.id.split('-').at(-1)) <= 60 && dish.id !== 'dish-seed-13',
      )
      const dish = (id) => seed.dishes.find((entry) => entry.id === id)
      dish('dish-seed-14').meal = 'lunch'
      delete dish('dish-seed-14').originalPrice
      dish('dish-seed-40').meal = 'night'
      dish('dish-04').price = 16
      delete dish('dish-04').originalPrice
      dish('dish-seed-20').status = 'success'
      dish('dish-seed-41').status = 'warning'
      dish('dish-seed-59').listed = false
      dish('dish-seed-59').status = 'success'
      orders = structuredClone(seed.orders)
    },
  })
  try {
    const upgraded = JSON.parse(fs.readFileSync(legacy.dbFile, 'utf8'))
    const dish = (id) => upgraded.dishes.find((entry) => entry.id === id)
    assert.deepEqual(upgraded.orders, orders)
    assert.equal(upgraded.dishes.length, seedDishes.length - 1)
    assert.equal(dish('dish-seed-13'), undefined)
    assert.equal(dish('dish-seed-68').meal, 'night')
    assert.equal(dish('dish-seed-14').meal, 'dinner')
    assert.equal(dish('dish-seed-14').originalPrice, 7.5)
    assert.equal(dish('dish-seed-40').meal, 'night')
    assert.equal(dish('dish-04').price, 16)
    assert.equal(dish('dish-04').originalPrice, undefined)
    assert.equal(dish('dish-seed-20').status, 'warning')
    assert.equal(dish('dish-seed-41').status, 'warning')
    assert.equal(dish('dish-seed-59').listed, false)
    assert.equal(dish('dish-seed-59').status, 'success')
  } finally {
    await legacy.close()
  }
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
    (
      await api.request('/dishes/dish-03', {
        method: 'PUT',
        token: merchant,
        body: { price: 19.9 },
      })
    ).status,
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

  assert.equal(
    (await api.request(`/dishes/${id}`, { method: 'DELETE', token: merchant })).status,
    204,
  )
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
  assert.equal(
    (await api.request('/dishes/dish-01', { method: 'DELETE', token: student })).status,
    403,
  )
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
    body: {
      items: [
        { dishId: 'dish-01', qty: 1 },
        { dishId: 'dish-01', qty: 2 },
      ],
    },
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
    (
      await api.request(`/orders/${order.id}`, {
        method: 'PUT',
        token: student,
        body: { action: 'next' },
      })
    ).status,
    403,
  )
  assert.equal(
    (
      await api.request(`/orders/${order.id}`, {
        method: 'PUT',
        token: merchant,
        body: { action: 'confirm' },
      })
    ).status,
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

  const fujianBreakfast = await api.request(
    `/dishes?cuisine=${encodeURIComponent('闽菜')}&meal=breakfast`,
    { token: student },
  )
  assert.equal(fujianBreakfast.status, 200)
  assert.deepEqual(
    fujianBreakfast.body.map((dish) => dish.name),
    ['泉州面线糊'],
  )

  const search = await api.request(`/dishes?q=${encodeURIComponent('拉面')}`, { token: student })
  assert.ok(search.body.some((dish) => dish.name.includes('拉面')))

  assert.equal((await api.request('/dishes?meal=brunch', { token: student })).status, 422)
  assert.equal((await api.request('/dishes?cuisine=unknown', { token: student })).status, 422)
  assert.equal((await api.request('/orders?status=unknown', { token: student })).status, 422)
})

test('评价只属于本人的已完成订单，修改星级后菜单和详情同步', async () => {
  const order = await createOrder([{ dishId: 'dish-01', qty: 1 }])
  const rate = (token, stars, dishId = 'dish-01') =>
    api.request(`/orders/${order.id}/ratings/${dishId}`, { method: 'PUT', token, body: { stars } })
  assert.equal((await rate(student, 4)).status, 409)
  await api.request(`/orders/${order.id}`, {
    method: 'PUT',
    token: merchant,
    body: { action: 'next' },
  })
  const summary = await api.request('/me/summary', { token: student })
  assert.ok(summary.body.readyOrders >= 1)
  await api.request(`/orders/${order.id}`, {
    method: 'PUT',
    token: student,
    body: { action: 'confirm' },
  })
  assert.equal((await rate(secondStudent, 5)).status, 404)
  assert.equal((await rate(merchant, 5)).status, 404)
  assert.equal((await rate(student, 6)).status, 422)
  assert.equal((await rate(student, 3, 'dish-03')).status, 404)
  assert.equal((await rate(student, 4)).body.ratings['dish-01'], 4)
  await rate(student, 5)
  const dish = (await api.request('/dishes/dish-01', { token: student })).body
  assert.deepEqual([dish.rating, dish.reviewCount], [5, 1])
  const list = (await api.request('/dishes', { token: student })).body
  assert.equal(list.find((row) => row.id === dish.id).rating, 5)
})

test('下架后学生列表与下单同步，商家管理保留菜品和库存状态', async () => {
  const update = (listed) =>
    api.request('/dishes/dish-02', { method: 'PUT', token: merchant, body: { listed } })
  assert.equal((await update(false)).status, 200)
  assert.equal((await api.request('/dishes/dish-02', { token: student })).status, 404)
  const studentList = await api.request('/dishes?manage=1', { token: student })
  assert.ok(!studentList.body.some((dish) => dish.id === 'dish-02'))
  const manageList = await api.request('/dishes?manage=1', { token: merchant })
  assert.ok(manageList.body.some((dish) => dish.id === 'dish-02' && dish.listed === false))
  assert.equal(
    (
      await api.request('/orders', {
        method: 'POST',
        token: student,
        body: { items: [{ dishId: 'dish-02', qty: 1 }] },
      })
    ).body.code,
    'DISH_UNLISTED',
  )
  assert.equal((await update(true)).body.status, 'success')
})

test('相同结算重试只创建一单，复用标识更改明细会被拒绝', async () => {
  const send = (qty) =>
    api.request('/orders', {
      method: 'POST',
      token: student,
      headers: { 'Idempotency-Key': 'aa'.repeat(16) },
      body: { items: [{ dishId: 'dish-01', qty }] },
    })
  const [first, second] = await Promise.all([send(1), send(1)])
  assert.deepEqual([first.status, second.status].sort(), [200, 201])
  assert.equal(first.body.id, second.body.id)
  assert.equal((await send(2)).status, 409)
})
