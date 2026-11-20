import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDishPayload,
  filterDishList,
  formatPrice,
  formatYuanFromCents,
  isDishSoldOut,
  isValidDishId,
  resolveDishImage,
  toCents,
} from '../../src/components/dishes/dish-meta.js'

const sampleDishes = [
  {
    id: 'dish-01',
    name: '招牌红烧肉饭',
    price: 18,
    stall: '青禾小厨',
    stallId: 'stall-1',
    category: '家常小炒',
    meal: 'lunch',
    status: 'success',
    desc: '慢炖三小时，肥瘦相间',
  },
  {
    id: 'dish-06',
    name: '牛肉拉面',
    price: 17,
    stall: '麦香面馆',
    stallId: 'stall-2',
    category: '面食米线',
    meal: 'breakfast',
    status: 'success',
    desc: '清炖牛骨汤底',
  },
  {
    id: 'dish-11',
    name: '糖醋里脊',
    price: 16,
    stall: '青禾小厨',
    stallId: 'stall-1',
    category: '家常小炒',
    meal: 'lunch',
    status: 'danger',
    desc: '外酥里嫩，酸甜开胃',
  },
]

test('金额转换与汇总按整数分计算，无浮点误差', () => {
  assert.equal(toCents(16.5), 1650)
  assert.equal(formatPrice(18), '18.00')
  assert.equal(formatYuanFromCents(toCents(0.1) + toCents(0.2)), '0.30')
})

test('动态菜品编号校验拦截非法格式与路径穿越', () => {
  assert.equal(isValidDishId('dish-01'), true)
  assert.equal(isValidDishId('dish_custom_2'), true)
  for (const invalid of ['', ' ', '../login', 'dish/01', 'bad!id', 'a'.repeat(65)]) {
    assert.equal(isValidDishId(invalid), false)
  }
})

test('售罄判定兼容 status=danger、soldOut 与 available=false', () => {
  assert.equal(isDishSoldOut(sampleDishes[0]), false)
  assert.equal(isDishSoldOut(sampleDishes[2]), true)
  assert.equal(isDishSoldOut({ status: 'success', soldOut: true }), true)
  assert.equal(isDishSoldOut({ status: 'success', available: false }), true)
})

test('菜品图片路径兼容相对 base 与根路径', () => {
  assert.equal(resolveDishImage('/images/hongshaorou.jpg', './'), './images/hongshaorou.jpg')
  assert.equal(resolveDishImage('/images/jilifan.jpg', '/'), '/images/jilifan.jpg')
  assert.equal(resolveDishImage('', './'), './images/fresh-bowl.jpg')
  assert.equal(resolveDishImage('https://example.com/a.jpg', './'), 'https://example.com/a.jpg')
})

test('菜单四维筛选支持档口、餐次、分类、状态与关键词组合过滤', () => {
  assert.equal(filterDishList(sampleDishes, { stallId: 'stall-1' }).length, 2)
  assert.equal(filterDishList(sampleDishes, { meal: 'breakfast' }).length, 1)
  assert.equal(filterDishList(sampleDishes, { status: 'danger' }).length, 1)
  assert.equal(filterDishList(sampleDishes, { category: '面食米线' }).length, 1)
  assert.equal(filterDishList(sampleDishes, { keyword: '红烧肉' }).length, 1)
  assert.equal(filterDishList(sampleDishes, { keyword: '牛骨' }).length, 1)
})

test('构造菜品写载荷只保留白名单字段并清理空原价', () => {
  const payload = buildDishPayload({
    name: '  香菇滑鸡饭  ',
    price: '15.50',
    originalPrice: '',
    category: '家常小炒',
    meal: 'lunch',
    status: 'success',
    spice: 1,
    image: '/images/jilifan.jpg',
    badges: ['招牌', '招牌', '新品'],
    desc: '  鲜嫩鸡腿配香菇  ',
    id: 'should-not-leak',
  })
  assert.equal('id' in payload, false)
  assert.equal('originalPrice' in payload, false)
  assert.equal(payload.name, '香菇滑鸡饭')
  assert.equal(payload.price, 15.5)
  assert.deepEqual(payload.badges, ['招牌', '新品'])

  const withOriginal = buildDishPayload({
    name: '套餐',
    price: 16,
    originalPrice: '20.00',
  })
  assert.equal(withOriginal.originalPrice, 20)
})
