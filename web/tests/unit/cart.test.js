import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useCartStore } from '../../src/stores/cart.js'

function dish(id, price, stall = '一档') {
  return { id, name: `菜品${id}`, image: `/images/${id}.png`, price, stall }
}

beforeEach(() => setActivePinia(createPinia()))

test('金额按分累加，0.1 + 0.2 不会出现浮点误差', () => {
  const cart = useCartStore()
  cart.add(dish('dish-01', 0.1))
  cart.add(dish('dish-02', 0.2))
  assert.equal(cart.totalCents, 30)
  assert.equal(cart.total, 0.3)
})

test('同一菜品重复加入只增加数量，最多 20 份，并按最新价格结算', () => {
  const cart = useCartStore()
  cart.add(dish('dish-01', 12.5), 5)
  cart.add(dish('dish-01', 13.8), 30)
  assert.equal(cart.items.length, 1)
  assert.equal(cart.items[0].qty, 20)
  assert.equal(cart.items[0].priceCents, 1380)
  assert.equal(cart.totalCents, 27600)
})

test('减少、修改数量、移除和清空都通过 actions 改状态', () => {
  const cart = useCartStore()
  cart.add(dish('dish-01', 10))
  cart.add(dish('dish-02', 8))
  cart.decrease('dish-01')
  assert.equal(
    cart.items.find((item) => item.dishId === 'dish-01'),
    undefined,
  )

  cart.setQty('dish-02', 0)
  assert.equal(cart.isEmpty, true)

  cart.add(dish('dish-03', 6), 2)
  cart.setQty('dish-03', 2.5)
  assert.equal(cart.items[0].qty, 2, '非整数数量直接忽略，不清空菜品')

  cart.clear()
  assert.equal(cart.isEmpty, true)
  assert.equal(cart.meal, 'lunch')
})

test('按档口分组的小计同样用整数分计算', () => {
  const cart = useCartStore()
  cart.add(dish('dish-01', 0.1, '一档'))
  cart.add(dish('dish-02', 0.2, '一档'), 2)
  cart.add(dish('dish-03', 3.3, '二档'))
  const groups = cart.byStall
  const first = groups.find((group) => group.stall === '一档')
  assert.equal(first.subtotalCents, 50)
  assert.equal(first.subtotal, 0.5)
  assert.equal(groups.find((group) => group.stall === '二档').subtotal, 3.3)
})

test('下单载荷只提交菜品号和数量，价格交给服务端核算', () => {
  const cart = useCartStore()
  cart.add(dish('dish-01', 12.5), 2)
  cart.setMeal('dinner')
  assert.deepEqual(cart.payload('少放辣'), {
    meal: 'dinner',
    remark: '少放辣',
    items: [{ dishId: 'dish-01', qty: 2 }],
  })
})

test('刷新后旧的 price（元）数据能迁移成 priceCents（分）', () => {
  const cart = useCartStore()
  cart.items = [
    { dishId: 'dish-01', name: '旧数据', image: '', price: 12.34, qty: 2, stall: '一档' },
  ]
  cart.migrate()
  assert.equal(cart.items[0].priceCents, 1234)
  // price 只是给移动端页面展示用的兼容字段，计算仍走 priceCents
  assert.equal(cart.items[0].price, 12.34)
  assert.equal(cart.total, 24.68)
})
