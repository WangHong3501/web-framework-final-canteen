import taxonomy from '../../shared/dish-taxonomy.json' with { type: 'json' }

export const DISH_CATEGORIES = taxonomy.categories
export const DISH_CUISINES = taxonomy.cuisines
export const DEFAULT_CUISINE = taxonomy.defaultCuisine

export const DISH_MEALS = [
  { key: 'all', label: '全部餐次', icon: 'Utensils' },
  { key: 'breakfast', label: '早餐', icon: 'Sun' },
  { key: 'lunch', label: '午餐', icon: 'Soup' },
  { key: 'dinner', label: '晚餐', icon: 'Moon' },
  { key: 'night', label: '夜宵', icon: 'Sparkles' },
]

export const DISH_MEAL_KEYS = ['breakfast', 'lunch', 'dinner', 'night']

export const DISH_STATUS_OPTIONS = [
  { value: 'success', label: '可点餐' },
  { value: 'warning', label: '余量少' },
  { value: 'danger', label: '已售罄' },
]

export const DISH_SPICE_OPTIONS = [
  { value: 0, label: '不辣' },
  { value: 1, label: '微辣' },
  { value: 2, label: '中辣' },
  { value: 3, label: '特辣' },
]

export const DISH_IMAGE_OPTIONS = [
  { value: '/images/dish-01.webp', label: '招牌红烧肉饭' },
  { value: '/images/dish-02.webp', label: '香煎鸡腿饭' },
  { value: '/images/dish-03.webp', label: '元气藜麦轻食碗' },
  { value: '/images/dish-04.webp', label: '宫保鸡丁' },
  { value: '/images/dish-05.webp', label: '麻婆豆腐' },
  { value: '/images/dish-06.webp', label: '牛肉拉面' },
  { value: '/images/dish-07.webp', label: '番茄鸡蛋面' },
  { value: '/images/dish-08.webp', label: '黑椒牛柳饭' },
  { value: '/images/dish-09.webp', label: '香辣鸡腿堡' },
  { value: '/images/dish-10.webp', label: '时蔬沙拉' },
  { value: '/images/dish-11.webp', label: '糖醋里脊' },
  { value: '/images/dish-12.webp', label: '皮蛋瘦肉粥' },

  { value: '/images/hongshaorou.jpg', label: '红烧小炒实景' },
  { value: '/images/jilifan.jpg', label: '香煎风味实景' },
  { value: '/images/fresh-bowl.jpg', label: '轻食鲜蔬实景' },
]

export const DISH_BADGE_OPTIONS = ['招牌', '新品']

const SPICE_MAP = Object.fromEntries(DISH_SPICE_OPTIONS.map((item) => [item.value, item.label]))
const STATUS_MAP = Object.fromEntries(DISH_STATUS_OPTIONS.map((item) => [item.value, item.label]))
const MEAL_MAP = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  night: '夜宵',
}

export function isValidDishId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id.trim())
}

export function isDishSoldOut(dish) {
  return (
    dish?.status === 'danger' ||
    dish?.soldOut === true ||
    dish?.available === false ||
    dish?.listed === false
  )
}

export function resolveDishImage(src, baseUrl = '/') {
  const base = String(baseUrl || '/').endsWith('/') ? String(baseUrl || '/') : `${baseUrl}/`
  const value = String(src || '').trim()
  if (!value) return `${base}images/fresh-bowl.jpg`
  if (/^https?:\/\//.test(value)) return value
  if (value.startsWith('/')) return `${base}${value.slice(1)}`
  return `${base}${value}`
}

export function toCents(yuan) {
  const num = Number(yuan)
  return Number.isFinite(num) ? Math.round(num * 100) : 0
}

export function formatYuanFromCents(cents) {
  const safe = Number.isFinite(Number(cents)) ? Math.round(Number(cents)) : 0
  return (safe / 100).toFixed(2)
}

export function formatPrice(yuan) {
  return formatYuanFromCents(toCents(yuan))
}

export function spiceLabel(level) {
  const key = Number(level)
  return SPICE_MAP[key] || '不辣'
}

export function mealLabel(meal) {
  return MEAL_MAP[meal] || '午餐'
}

export function statusLabel(status) {
  return STATUS_MAP[status] || '可点餐'
}

export function filterDishList(
  dishes = [],
  {
    meal = 'all',
    stallId = 'all',
    category = '全部',
    cuisine = '全部',
    keyword = '',
    status = 'all',
  } = {},
) {
  const list = Array.isArray(dishes) ? dishes : []
  const term = String(keyword || '')
    .trim()
    .toLowerCase()
  return list.filter((dish) => {
    if (meal && meal !== 'all' && dish.meal !== meal) return false
    if (stallId && stallId !== 'all' && String(dish.stallId) !== String(stallId)) return false
    if (category && category !== '全部' && dish.category !== category) return false
    const dishCuisine = dish.cuisine || DEFAULT_CUISINE
    if (cuisine && cuisine !== '全部' && dishCuisine !== cuisine) return false
    if (status && status !== 'all' && dish.status !== status) return false
    if (!term) return true
    return [dish.name, dish.desc, dish.stall, dish.category, dishCuisine].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(term),
    )
  })
}

export function buildDishPayload(form = {}) {
  const priceCents = toCents(form.price)
  const payload = {
    name: String(form.name || '').trim(),
    price: priceCents / 100,
    image: String(form.image || '').trim() || '/images/fresh-bowl.jpg',
    desc: String(form.desc || '').trim(),
    category: DISH_CATEGORIES.includes(form.category) ? form.category : DISH_CATEGORIES[0],
    meal: DISH_MEAL_KEYS.includes(form.meal) ? form.meal : 'lunch',
    status: STATUS_MAP[form.status] ? form.status : 'success',
    badges: Array.isArray(form.badges)
      ? [...new Set(form.badges.map((b) => String(b).trim()).filter(Boolean))].slice(0, 3)
      : [],
    spice: Number.isInteger(Number(form.spice)) ? Math.min(3, Math.max(0, Number(form.spice))) : 0,
  }
  if (DISH_CUISINES.includes(form.cuisine)) payload.cuisine = form.cuisine
  const hasOriginal =
    form.originalPrice !== '' &&
    form.originalPrice !== null &&
    form.originalPrice !== undefined &&
    Number.isFinite(Number(form.originalPrice)) &&
    Number(form.originalPrice) > 0
  if (hasOriginal) {
    payload.originalPrice = toCents(form.originalPrice) / 100
  }
  return payload
}
