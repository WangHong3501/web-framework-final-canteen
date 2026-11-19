import { computed, ref } from 'vue'

/**
 * 双端共享的菜单筛选逻辑。
 * 桌面 Element Plus 页与移动 Vant 页都消费这份逻辑，
 * 保证「餐次 / 分类 / 搜索 / 售罄判定」的业务语义 100% 一致，
 * 只在布局密度上做适配。
 */
export const MEALS = [
  { key: 'breakfast', label: '早餐', icon: 'Sun' },
  { key: 'lunch', label: '午餐', icon: 'Soup' },
  { key: 'dinner', label: '晚餐', icon: 'Moon' },
  { key: 'night', label: '夜宵', icon: 'Sparkles' },
]

export const CATEGORIES = ['全部', '家常小炒', '面食米线', '轻食蔬菜', '风味套餐']

export function isSoldOut(dish) {
  return dish?.status === 'danger' || dish?.soldOut === true
}

export function useMenu(dishesRef) {
  const meal = ref('lunch')
  const category = ref('全部')
  const keyword = ref('')

  const mealDishes = computed(() => {
    const list = dishesRef.value || []
    return list.filter((dish) => !dish.meal || dish.meal === meal.value)
  })

  const categories = computed(() => {
    const present = new Set(mealDishes.value.map((d) => d.category).filter(Boolean))
    return CATEGORIES.filter((c) => c === '全部' || present.has(c))
  })

  const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    return mealDishes.value.filter((dish) => {
      const categoryOk = category.value === '全部' || dish.category === category.value
      const keywordOk =
        !kw ||
        dish.name.toLowerCase().includes(kw) ||
        (dish.desc || '').toLowerCase().includes(kw)
      return categoryOk && keywordOk
    })
  })

  function resetFilters() {
    category.value = '全部'
    keyword.value = ''
  }

  return { meal, category, keyword, mealDishes, categories, filtered, resetFilters }
}
