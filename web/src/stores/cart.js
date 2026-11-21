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
    qty: Math.min(Math.max(Number(item.qty) || 1, 1), MAX_QTY),
  }
}

/**
 * 点餐车业务仓库：双端共用同一份状态与逻辑，保证桌面 Element Plus
 * 与移动 Vant 页面加减菜品、合计金额的行为完全一致。
 * persist 打开，刷新后餐车不丢（对应 T6 持久化硬指标）。
 */
export const useCartStore = defineStore('cart', {
  state: () => ({
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
      const groups = {}
      for (const item of state.items) {
        const key = item.stall || '其他'
        if (!groups[key]) groups[key] = { stall: key, items: [], subtotalCents: 0 }
        groups[key].items.push(item)
        groups[key].subtotalCents += centsOf(item) * item.qty
      }
      return Object.values(groups).map((group) => ({
        ...group,
        subtotal: group.subtotalCents / 100,
      }))
    },
  },
  actions: {
    /** 把刷新前留下的旧格式（price 元）统一迁成 priceCents */
    migrate() {
      this.items = this.items.map(normalizeItem)
    },
    add(dish, qty = 1) {
      const priceCents = toCents(dish.price)
      const existing = this.items.find((item) => item.dishId === dish.id)
      if (existing) {
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
      this.meal = 'lunch'
    },
    setMeal(meal) {
      this.meal = meal
    },
    /** 生成下单载荷，价格由服务端重新核算，这里只提交数量 */
    payload(remark = '') {
      return {
        meal: this.meal,
        remark,
        items: this.items.map((item) => ({ dishId: item.dishId, qty: item.qty })),
      }
    },
  },
  persist: {
    key: 'shiguang-cart',
    pick: ['items', 'meal'],
    afterHydrate: (context) => context.store.migrate(),
  },
})
