import { defineStore } from 'pinia'

const MAX_QTY = 20

/** 元转分：金额一律先转整数分再算，避免 0.1 + 0.2 这类浮点误差 */
function toCents(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/** 兼容旧版持久化数据：老数据只有 price（元），没有 priceCents */
function centsOf(item) {
  return Number.isInteger(item.priceCents) ? item.priceCents : toCents(item.price)
}

function normalizeItem(item) {
  const priceCents = centsOf(item)
  return {
    dishId: item.dishId,
    name: item.name,
    image: item.image,
    priceCents,
    // 只读展示字段：移动端页面仍按 item.price 显示，金额计算一律用 priceCents
    price: priceCents / 100,
    stall: item.stall || '',
    stallId: item.stallId || '',
    qty: Math.min(Math.max(Math.trunc(Number(item.qty)) || 1, 1), MAX_QTY),
  }
}

/**
 * 点餐车业务仓库：双端共用同一份状态与逻辑，保证桌面 Element Plus
 * 与移动 Vant 页面加减菜品、合计金额的行为完全一致。
 * persist 打开，刷新后餐车不丢（对应 T6 持久化硬指标）。
 */
export const useCartStore = defineStore('cart', {
  state: () => ({
    ownerId: '',
    attempts: {},
    items: [], // { dishId, name, image, priceCents, price, qty, stall }
    meal: 'lunch',
  }),
  getters: {
    count: (state) => state.items.reduce((sum, item) => sum + item.qty, 0),
    /** 合计（分），所有金额计算的唯一口径 */
    totalCents: (state) => state.items.reduce((sum, item) => sum + centsOf(item) * item.qty, 0),
    /** 展示用合计（元），只在最后一步除以 100 */
    total() {
      return this.totalCents / 100
    },
    isEmpty: (state) => state.items.length === 0,
    /** 按档口分组，用于确认订单与移动端点餐车展示 */
    byStall: (state) => {
      const idsByName = new Map(
        state.items.filter((item) => item.stallId).map((item) => [item.stall, item.stallId]),
      )
      const groups = new Map()
      for (const item of state.items) {
        const key = item.stallId || idsByName.get(item.stall) || item.stall || item.dishId
        if (!groups.has(key))
          groups.set(key, {
            key,
            stall: item.stall || '未命名档口',
            items: [],
            count: 0,
            subtotalCents: 0,
          })
        const group = groups.get(key)
        group.items.push(item)
        group.count += item.qty
        group.subtotalCents += centsOf(item) * item.qty
      }
      return Array.from(groups.values(), (group) => ({
        ...group,
        subtotal: group.subtotalCents / 100,
      }))
    },
  },
  actions: {
    /** 把刷新前留下的旧格式（price 元）统一迁成 priceCents */
    bindAccount(id) {
      if (this.ownerId && this.ownerId !== id) this.clear()
      this.ownerId = id
    },
    migrate() {
      this.items = Array.isArray(this.items)
        ? this.items.filter((item) => item?.dishId).map(normalizeItem)
        : []
    },
    add(dish, qty = 1) {
      if (!Number.isInteger(qty) || qty < 1) return
      const priceCents = toCents(dish.price)
      const existing = this.items.find((item) => item.dishId === dish.id)
      if (existing) {
        existing.stallId = dish.stallId || existing.stallId
        existing.stall = dish.stall || existing.stall
        existing.qty = Math.min(existing.qty + qty, MAX_QTY)
        // 菜单价格调整后，购物车按最新价格结算
        existing.priceCents = priceCents
        existing.price = priceCents / 100
      } else {
        this.items.push(
          normalizeItem({
            dishId: dish.id,
            name: dish.name,
            image: dish.image,
            priceCents,
            stallId: dish.stallId,
            stall: dish.stall || '',
            qty: Math.min(qty, MAX_QTY),
          }),
        )
      }
    },
    decrease(dishId) {
      const item = this.items.find((i) => i.dishId === dishId)
      if (!item) return
      item.qty -= 1
      if (item.qty <= 0) this.remove(dishId)
    },
    setQty(dishId, qty) {
      const item = this.items.find((i) => i.dishId === dishId)
      if (!item) return
      const next = Number(qty)
      if (!Number.isInteger(next)) return
      if (next < 1) return this.remove(dishId)
      item.qty = Math.min(next, MAX_QTY)
    },
    remove(dishId) {
      this.items = this.items.filter((item) => item.dishId !== dishId)
    },
    clear() {
      this.items = []
      this.attempts = {}
      this.meal = 'lunch'
    },
    setMeal(meal) {
      this.meal = meal
    },
    /** 生成下单载荷，价格由服务端重新核算，这里只提交数量 */
    beginCheckout(group, remark) {
      const payload = this.payload(remark, group.items)
      const signature = JSON.stringify(payload)
      if (this.attempts[group.key]?.signature !== signature) {
        const bytes = crypto.getRandomValues(new Uint8Array(16))
        const key = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
        this.attempts[group.key] = { signature, key }
      }
      return { payload, key: this.attempts[group.key].key }
    },
    consume(lines, groupKey) {
      if (groupKey) delete this.attempts[groupKey]
      for (const { dishId, qty } of lines) {
        const current = this.items.find((item) => item.dishId === dishId)
        if (current) this.setQty(dishId, current.qty - qty)
      }
    },
    payload(remark = '', items = this.items) {
      return {
        meal: this.meal,
        remark,
        items: items.map(({ dishId, qty }) => ({ dishId, qty })),
      }
    },
  },
  persist: {
    key: 'shiguang-cart',
    pick: ['ownerId', 'items', 'meal', 'attempts'],
    afterHydrate: (context) => context.store.migrate(),
  },
})
