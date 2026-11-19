import { defineStore } from 'pinia'

/**
 * 点餐车业务仓库：双端共用同一份状态与逻辑，保证桌面 Element Plus
 * 与移动 Vant 页面加减菜品、合计金额的行为完全一致。
 * persist 打开，刷新后餐车不丢（对应 T6 持久化硬指标）。
 */
export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [], // { dishId, name, image, price, qty, stall }
    meal: 'lunch',
  }),
  getters: {
    count: (state) => state.items.reduce((sum, item) => sum + item.qty, 0),
    total: (state) =>
      Math.round(state.items.reduce((sum, item) => sum + item.price * item.qty, 0) * 100) / 100,
    isEmpty: (state) => state.items.length === 0,
    /** 按档口分组，用于确认订单与移动端点餐车展示 */
    byStall: (state) => {
      const groups = {}
      for (const item of state.items) {
        const key = item.stall || '其他'
        if (!groups[key]) groups[key] = { stall: key, items: [], subtotal: 0 }
        groups[key].items.push(item)
        groups[key].subtotal += item.price * item.qty
      }
      return Object.values(groups).map((g) => ({
        ...g,
        subtotal: Math.round(g.subtotal * 100) / 100,
      }))
    },
  },
  actions: {
    add(dish, qty = 1) {
      const existing = this.items.find((item) => item.dishId === dish.id)
      if (existing) {
        existing.qty = Math.min(existing.qty + qty, 20)
      } else {
        this.items.push({
          dishId: dish.id,
          name: dish.name,
          image: dish.image,
          price: Number(dish.price),
          stall: dish.stall || '',
          qty: Math.min(qty, 20),
        })
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
      if (!Number.isInteger(next) || next < 1) return this.remove(dishId)
      item.qty = Math.min(next, 20)
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
  },
})
