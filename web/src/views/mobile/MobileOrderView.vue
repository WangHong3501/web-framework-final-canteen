<script setup>
/**
 * Vant 移动端点餐页 —— 与桌面 MenuView 共享 useMenu / cart / 全部业务组件，
 * 视觉语言、交互逻辑、业务语义一致，仅在布局密度与触控尺寸上适配。
 * Vant 组件在此页按需引入，配合路由懒加载，桌面端产物不含任何 Vant 代码。
 */
import '@/styles/order.css'
import '@/styles/mobile.css' // 本页样式已抽到全局样式层，class 统一 m- 前缀

// Vant 按需引入（组件 + 样式）
import { Search, Stepper, Button, Dialog, Field, Tag, showToast } from 'vant'
import 'vant/es/search/style'
import 'vant/es/stepper/style'
import 'vant/es/button/style'
import 'vant/es/dialog/style'
import 'vant/es/field/style'
import 'vant/es/tag/style'
import 'vant/es/toast/style'

import { ref, computed, onMounted, watch } from 'vue'
import { catalogApi } from '@/api/catalog'
import { ordersApi } from '@/api/orders'
import { requestMessage } from '@/api/http'
import { useCartStore } from '@/stores/cart'
import { useMenu, MEALS, isSoldOut } from '@/shared/useMenu'
import PhoneFrame from '@/components/ui/PhoneFrame.vue'
import StatusTag from '@/components/ui/StatusTag.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import OrderStatusFlow from '@/components/ui/OrderStatusFlow.vue'
import PickupCode from '@/components/ui/PickupCode.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import QuickEntries from '@/components/ui/QuickEntries.vue'
import MobileTabBar from '@/components/ui/MobileTabBar.vue'
import { useRouter } from 'vue-router'

const cart = useCartStore()
const router = useRouter()
const dishes = ref([])
const orders = ref([])
const loading = ref(true)
const loadError = ref('')
// 底部主导航：order / cart / orders / mine
const activeNav = ref('order')
const scrollBox = ref(null)
const remark = ref('')
const confirmShow = ref(false)
const submitting = ref(false)

const { meal, category, keyword, categories, filtered, resetFilters } = useMenu(dishes)
const soldOut = isSoldOut

// 餐次切换同步到购物车：下单载荷与确认时段都取自 cart.meal
watch(meal, (v) => cart.setMeal(v), { immediate: true })

const qtyOf = (id) => cart.items.find((i) => i.dishId === id)?.qty || 0
const mealLabel = computed(() => MEALS.find((m) => m.key === cart.meal)?.label || '午餐')
const STATUS_LABEL = {
  preparing: '备餐中', ready: '待取餐', completed: '已完成', refunded: '已退款', pending: '待支付',
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [dishList, orderList] = await Promise.all([catalogApi.dishes(), ordersApi.list()])
    dishes.value = dishList
    orders.value = orderList
  } catch (error) {
    loadError.value = requestMessage(error, '加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

function onStep(dish, value) {
  const qty = Number(value)
  if (qty <= 0) return cart.remove(dish.id)
  // 首次加菜时餐车还没有该菜品，setQty 对不存在的 item 无效，必须走 add
  const exists = cart.items.some((item) => item.dishId === dish.id)
  if (!exists) cart.add(dish, qty)
  else cart.setQty(dish.id, qty)
}

function openConfirm() {
  if (cart.isEmpty) return
  confirmShow.value = true
}

async function submitOrder() {
  if (cart.isEmpty || submitting.value) return
  submitting.value = true
  try {
    const order = await ordersApi.create(cart.payload(remark.value))
    cart.clear()
    remark.value = ''
    confirmShow.value = false
    activeNav.value = 'orders'
    orders.value.unshift(order)
    showToast({ message: '下单成功，正在备餐', type: 'success' })
  } catch (error) {
    showToast(requestMessage(error, '下单失败，请重试。'))
  } finally {
    submitting.value = false
  }
}

async function confirmPickup(order) {
  try {
    const updated = await ordersApi.confirm(order.id)
    const idx = orders.value.findIndex((o) => o.id === order.id)
    if (idx >= 0) orders.value[idx] = updated
    showToast({ message: '已确认取餐', type: 'success' })
  } catch (error) {
    showToast(requestMessage(error))
  }
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// 底部主导航：点餐/餐车/订单在本页切换，我的跳个人中心
function onNavigate(key) {
  activeNav.value = key
  if (key === 'cart') {
    // 餐车即结算入口，有菜时才弹确认
    if (cart.isEmpty) showToast({ message: '餐车还是空的，先选几道菜吧' })
    else openConfirm()
    activeNav.value = 'order'
    return
  }
  if (key === 'mine') {
    router.push('/center/overview')
    return
  }
  if (key === 'order' && scrollBox.value) scrollBox.value.scrollTop = 0
}

// 金刚区快捷入口：点餐/订单切页，餐次与分类直接设筛选，餐车去结算
const MEAL_KEYS = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner' }
function onQuickEntry(key) {
  if (key === 'orders') return (activeNav.value = 'orders')
  if (key === 'signature') {
    resetFilters()
    keyword.value = '招牌'
    activeNav.value = 'order'
    return
  }
  if (key === 'order') return (activeNav.value = 'order')
  if (key === 'cart') return onNavigate('cart')
  if (MEAL_KEYS[key]) {
    meal.value = MEAL_KEYS[key]
    activeNav.value = 'order'
    return
  }
  if (key === 'veg') {
    // 轻食素食：匹配轻食分类
    const vegCat = categories.value.find((c) => c.includes('轻食') || c.includes('素'))
    if (vegCat) category.value = vegCat
    activeNav.value = 'order'
  }
}

onMounted(load)
</script>

<template>
  <div class="mobile-order-page">
    <header class="m-header">
      <div>
        <span class="m-header__eyebrow">食光校园</span>
        <h1>今天吃点好的</h1>
      </div>
      <span class="m-header__avatar">王</span>
    </header>

    <PhoneFrame label="Vant 移动端点餐 · 实时预览">
      <div class="m-scroll" ref="scrollBox">
        <!-- 点餐页 -->
        <div v-show="activeNav === 'order'" class="m-pane">
          <section class="m-hero">
            <span class="m-hero__eyebrow">FRESH · TODAY</span>
            <h2>好好吃饭，是每件大事</h2>
            <p>新鲜现做，到窗口即可取餐</p>
          </section>

          <!-- 美团式金刚区：快捷入口 -->
          <div class="m-quick">
            <QuickEntries :columns="4" active-key="" @select="onQuickEntry" />
          </div>

          <div class="m-controls">
              <Search
                v-model="keyword"
                placeholder="搜索菜名或口味"
                shape="round"
                background="transparent"
                class="m-search"
              />
              <div class="m-meals" role="tablist" aria-label="餐次切换">
                <button
                  v-for="item in MEALS"
                  :key="item.key"
                  type="button"
                  class="m-meal"
                  :class="{ 'is-active': meal === item.key }"
                  @click="meal = item.key"
                >
                  {{ item.label }}
                </button>
              </div>
              <div class="m-categories">
                <button
                  v-for="cat in categories"
                  :key="cat"
                  type="button"
                  class="m-chip"
                  :class="{ 'is-active': cat === category }"
                  @click="category = cat"
                >
                  {{ cat }}
                </button>
              </div>
            </div>

            <div v-if="loadError" class="m-state" role="alert">
              <AppIcon name="CircleAlert" :size="24" />
              <p>{{ loadError }}</p>
              <Button size="small" type="primary" @click="load">重新加载</Button>
            </div>

            <div v-else-if="loading" class="m-state">
              <p>正在加载今日菜单…</p>
            </div>

            <template v-else-if="filtered.length">
              <article
                v-for="dish in filtered"
                :key="dish.id"
                class="m-dish"
                :class="{ 'is-sold': soldOut(dish) }"
              >
                <div class="m-dish__media">
                  <img :src="dish.image" :alt="dish.name" loading="lazy" />
                  <div v-if="dish.badges?.length" class="m-dish__badges">
                    <span v-for="badge in dish.badges" :key="badge" class="m-dish__badge">{{ badge }}</span>
                  </div>
                  <div v-if="soldOut(dish)" class="m-dish__mask">今日售罄</div>
                </div>
                <div class="m-dish__body">
                  <h3>{{ dish.name }}</h3>
                  <p class="m-dish__desc">{{ dish.desc }}</p>
                  <div class="m-dish__tags">
                    <StatusTag v-if="dish.spice" type="hot" size="sm" :text="dish.spice === 3 ? '特辣' : dish.spice === 2 ? '中辣' : '微辣'" />
                    <StatusTag v-for="tag in dish.tags" :key="tag.text" :type="tag.type" size="sm" :text="tag.text" />
                  </div>
                  <div class="m-dish__bottom">
                    <PriceTag :value="dish.price" :original="dish.originalPrice" size="md" />
                    <Stepper
                      v-if="!soldOut(dish)"
                      :model-value="qtyOf(dish.id)"
                      min="0"
                      :max="20"
                      theme="round"
                      button-size="28"
                      icon-size="14"
                      @change="(v) => onStep(dish, v)"
                    />
                    <span v-else class="m-dish__sold">明日再来</span>
                  </div>
                </div>
              </article>
              <p class="m-list-end">— 今天的全部菜品都在这里啦 —</p>
            </template>

            <div v-else class="m-state">
              <AppIcon name="Search" :size="24" />
              <p>换个条件试试看</p>
              <Button size="small" @click="resetFilters(); keyword = ''">重置筛选</Button>
            </div>
        </div>

        <!-- 订单页 -->
        <div v-show="activeNav === 'orders'" class="m-pane">
          <div class="m-orders" v-if="orders.length">
              <article v-for="order in orders" :key="order.id" class="m-order">
                <div class="m-order__head">
                  <div>
                    <strong>{{ order.id }}</strong>
                    <span>{{ formatTime(order.createdAt) }}</span>
                  </div>
                  <Tag type="primary" round>{{ STATUS_LABEL[order.status] }}</Tag>
                </div>
                <div class="m-order__items">
                  <img v-for="item in order.items.slice(0, 3)" :key="item.dishId" :src="item.image" :alt="item.name" />
                  <span>{{ order.items.map((i) => `${i.name}×${i.qty}`).join('、') }}</span>
                </div>
                <OrderStatusFlow :status="order.status" compact />
                <PickupCode
                  v-if="['preparing', 'ready'].includes(order.status)"
                  :code="order.pickupCode"
                  :window="order.window"
                  :eta="order.eta"
                  size="sm"
                />
                <div class="m-order__foot">
                  <PriceTag :value="order.total" size="md" />
                  <Button
                    v-if="order.status === 'ready'"
                    type="primary"
                    size="small"
                    round
                    @click="confirmPickup(order)"
                  >
                    我已取餐
                  </Button>
                </div>
              </article>
            </div>
            <div v-else class="m-state">
              <AppIcon name="ReceiptText" :size="24" />
              <p>还没有订单，先去点一单吧</p>
              <Button size="small" type="primary" @click="activeNav = 'order'">去点餐</Button>
            </div>
        </div>
      </div>

      <!-- 底部主导航（美团式） -->
      <MobileTabBar :active="activeNav" :cart-count="cart.count" @navigate="onNavigate" />

      <Transition name="bar">
        <div v-if="cart.count > 0 && activeNav === 'order'" class="m-submit-bar">
          <div class="m-submit-bar__basket">
            <AppIcon name="ShoppingCart" :size="22" />
            <span class="m-submit-bar__badge">{{ cart.count }}</span>
          </div>
          <div class="m-submit-bar__price">
            <small>合计</small>
            <PriceTag :value="cart.total" size="sm" />
          </div>
          <Button type="primary" round class="m-submit-bar__btn" @click="openConfirm">去结算</Button>
        </div>
      </Transition>

      <Dialog
        v-model:show="confirmShow"
        title="确认订单"
        :show-cancel-button="false"
        :show-confirm-button="false"
        class="m-confirm"
      >
        <div class="m-confirm__body">
          <div class="m-confirm__meal">
            <span>用餐时段</span>
            <strong>{{ mealLabel }}</strong>
          </div>
          <div v-for="group in cart.byStall" :key="group.stall" class="m-confirm__group">
            <strong>{{ group.stall }}</strong>
            <div v-for="item in group.items" :key="item.dishId" class="m-confirm__line">
              <span>{{ item.name }}</span>
              <span>×{{ item.qty }}</span>
              <span>¥{{ (item.price * item.qty).toFixed(2) }}</span>
            </div>
          </div>
          <Field
            v-model="remark"
            rows="2"
            autosize
            type="textarea"
            maxlength="100"
            show-word-limit
            placeholder="口味备注（可选）"
            class="m-confirm__remark"
          />
          <div class="m-confirm__total">
            <span>应付合计</span>
            <PriceTag :value="cart.total" size="lg" />
          </div>
          <Button type="primary" block round :loading="submitting" @click="submitOrder">
            提交订单
          </Button>
        </div>
      </Dialog>
    </PhoneFrame>

    <p class="m-footnote">与桌面端共享同一套设计令牌、业务组件与购物车状态</p>
  </div>
</template>
