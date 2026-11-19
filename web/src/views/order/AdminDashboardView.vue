<script setup>
/**
 * 商家经营概览：只读聚合现有订单/菜品数据，不改动下单、核价或状态机。
 * 与订单工作台、档口管理共用同一套设计令牌和 SectionPanel / StatusTag 组件。
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import '@/styles/admin-dashboard.css'
import { ordersApi } from '@/api/orders'
import { catalogApi } from '@/api/catalog'
import { requestMessage } from '@/api/http'
import { useUserStore } from '@/stores/user'
import AppIcon from '@/components/ui/AppIcon.vue'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import StatusTag from '@/components/ui/StatusTag.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const router = useRouter()
const user = useUserStore()
const assetBase = import.meta.env.BASE_URL

const orders = ref([])
const dishes = ref([])
const loading = ref(true)
const errorMsg = ref('')

const STATUS_LABEL = {
  pending: '待支付',
  preparing: '备餐中',
  ready: '待取餐',
  completed: '已完成',
  refunded: '已退款',
}
const STATUS_TYPE = {
  pending: 'warning',
  preparing: 'info',
  ready: 'brand',
  completed: 'success',
  refunded: 'danger',
}
const STATUS_ORDER = ['preparing', 'ready', 'completed', 'refunded']

function dateKey(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

const todayKey = dateKey(new Date())

const todayOrders = computed(() => orders.value.filter((order) => dateKey(order.createdAt) === todayKey))
const validTodayOrders = computed(() => todayOrders.value.filter((order) => order.status !== 'refunded'))
const todayRevenue = computed(() =>
  round2(validTodayOrders.value.reduce((sum, order) => sum + Number(order.total || 0), 0)),
)
const avgTicket = computed(() =>
  validTodayOrders.value.length ? round2(todayRevenue.value / validTodayOrders.value.length) : 0,
)
const activeCount = computed(() =>
  orders.value.filter((order) => ['preparing', 'ready'].includes(order.status)).length,
)

const ownDishes = computed(() => {
  const stallId = user.user?.stallId
  return stallId ? dishes.value.filter((dish) => dish.stallId === stallId) : dishes.value
})

const soldOutDishes = computed(() =>
  ownDishes.value.filter((dish) => dish.status === 'danger' || dish.soldOut),
)

const hotDishes = computed(() => {
  const tally = new Map()
  validTodayOrders.value.forEach((order) => {
    ;(order.items || []).forEach((item) => {
      const key = item.dishId || item.name
      const current = tally.get(key) || {
        name: item.name || '未知菜品',
        image: item.image || '',
        qty: 0,
        amount: 0,
      }
      current.qty += Number(item.qty) || 0
      current.amount += (Number(item.price) || 0) * (Number(item.qty) || 0)
      tally.set(key, current)
    })
  })

  const fromOrders = Array.from(tally.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
    .map((item) => ({ ...item, amount: round2(item.amount), fallback: false }))
  if (fromOrders.length) return fromOrders

  // 今日还没有订单时，用菜品自身的历史销量做参考，避免面板空白。
  return ownDishes.value
    .filter((dish) => Number(dish.sales) > 0)
    .sort((a, b) => Number(b.sales) - Number(a.sales))
    .slice(0, 5)
    .map((dish) => ({
      name: dish.name,
      image: dish.image,
      qty: Number(dish.sales),
      amount: round2(Number(dish.sales) * Number(dish.price)),
      fallback: true,
    }))
})

const hotSubtitle = computed(() =>
  hotDishes.value.some((item) => item.fallback)
    ? '今日暂无订单，展示档口历史热销参考'
    : '按今日有效订单的菜品销量统计',
)

const heroDish = computed(() => hotDishes.value[0] || null)
const heroImage = computed(() => heroDish.value?.image || `${assetBase}images/fresh-bowl.jpg`)

const statusStats = computed(() =>
  STATUS_ORDER.map((key) => {
    const count = orders.value.filter((order) => order.status === key).length
    return {
      key,
      label: STATUS_LABEL[key],
      type: STATUS_TYPE[key],
      count,
      percent: orders.value.length ? Math.round((count / orders.value.length) * 100) : 0,
    }
  }),
)

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [orderList, dishList] = await Promise.all([ordersApi.list(), catalogApi.dishes()])
    orders.value = Array.isArray(orderList) ? orderList : []
    dishes.value = Array.isArray(dishList) ? dishList : []
  } catch (error) {
    errorMsg.value = requestMessage(error, '经营数据加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="dash-page" data-testid="admin-dashboard">
    <div class="order-section-head">
      <div>
        <h2>经营概览</h2>
        <p>{{ user.user?.displayName }} · 今日经营情况与订单动态</p>
      </div>
      <div class="dash-actions">
        <el-button @click="router.push('/orders')">
          <AppIcon name="ReceiptText" :size="16" />订单工作台
        </el-button>
        <el-button type="primary" @click="router.push('/admin/dishes')">
          <AppIcon name="Store" :size="16" />档口管理
        </el-button>
      </div>
    </div>

    <div v-if="loading" class="dash-loading" role="status" aria-busy="true">正在汇总经营数据…</div>

    <div v-else-if="errorMsg" class="dash-error" role="alert">
      <AppIcon name="CircleAlert" :size="22" />
      <span>{{ errorMsg }}</span>
      <el-button size="small" @click="load">重试</el-button>
    </div>

    <template v-else>
      <section class="dash-hero">
        <div class="dash-hero__copy">
          <span class="dash-hero__eyebrow">TODAY · 营业中</span>
          <h3>{{ user.user?.displayName }}，今天也要好好营业。</h3>
          <p>实时汇总订单与菜品状态，哪些菜受欢迎、哪些菜需要留意，一眼看清。</p>
        </div>
        <div class="dash-hero__visual">
          <img :src="heroImage" :alt="heroDish?.name || '今日推荐菜品'" />
          <span v-if="heroDish">今日热销 · {{ heroDish.name }}</span>
        </div>
      </section>

      <section class="dash-metrics" aria-label="今日经营指标">
        <article class="dash-metric" data-testid="dash-metric-orders">
          <span class="dash-metric__icon"><AppIcon name="ShoppingBag" :size="21" /></span>
          <div class="dash-metric__body">
            <span class="dash-metric__label">今日订单</span>
            <strong class="dash-metric__value">{{ validTodayOrders.length }}<small> 笔</small></strong>
            <span class="dash-metric__note">累计 {{ orders.length }} 笔订单</span>
          </div>
        </article>

        <article class="dash-metric dash-metric--warm" data-testid="dash-metric-revenue">
          <span class="dash-metric__icon"><AppIcon name="Wallet" :size="21" /></span>
          <div class="dash-metric__body">
            <span class="dash-metric__label">今日营业额</span>
            <strong class="dash-metric__value">¥{{ todayRevenue.toFixed(2) }}</strong>
            <span class="dash-metric__note">按有效订单金额统计</span>
          </div>
        </article>

        <article class="dash-metric dash-metric--blue" data-testid="dash-metric-ticket">
          <span class="dash-metric__icon"><AppIcon name="ReceiptText" :size="21" /></span>
          <div class="dash-metric__body">
            <span class="dash-metric__label">客单价</span>
            <strong class="dash-metric__value">¥{{ avgTicket.toFixed(2) }}</strong>
            <span class="dash-metric__note">营业额 ÷ 有效订单数</span>
          </div>
        </article>

        <article class="dash-metric dash-metric--leaf" data-testid="dash-metric-active">
          <span class="dash-metric__icon"><AppIcon name="Timer" :size="21" /></span>
          <div class="dash-metric__body">
            <span class="dash-metric__label">进行中订单</span>
            <strong class="dash-metric__value">{{ activeCount }}<small> 笔</small></strong>
            <span class="dash-metric__note">备餐中 / 待取餐</span>
          </div>
        </article>
      </section>

      <div class="dash-grid">
        <SectionPanel title="热销菜品 TOP5" :subtitle="hotSubtitle">
          <ol v-if="hotDishes.length" class="dash-hot">
            <li v-for="(item, index) in hotDishes" :key="item.name">
              <span class="dash-hot__rank">{{ index + 1 }}</span>
              <img
                class="dash-hot__img"
                :src="item.image || `${assetBase}images/fresh-bowl.jpg`"
                :alt="item.name"
              />
              <div class="dash-hot__name">
                <strong>{{ item.name }}</strong>
                <span>
                  {{ item.fallback ? '历史' : '今日' }}销量 {{ item.qty }} 份 ·
                  {{ item.fallback ? '参考销售额' : '销售额' }} ¥{{ item.amount.toFixed(2) }}
                </span>
              </div>
              <PriceTag :value="item.amount" size="sm" />
            </li>
          </ol>
          <EmptyState
            v-else
            title="今天还没有销量数据"
            detail="有新的有效订单后，这里会展示本档口最受欢迎的菜品。"
            icon="Flame"
            compact
          />
        </SectionPanel>

        <SectionPanel title="订单状态分布" subtitle="当前全部订单，不按日期筛选">
          <ul class="dash-status">
            <li v-for="item in statusStats" :key="item.key">
              <div class="dash-status__top">
                <StatusTag :type="item.type" :text="item.label" size="sm" dot />
                <strong>{{ item.count }} 笔 · {{ item.percent }}%</strong>
              </div>
              <div
                class="dash-status__track"
                role="progressbar"
                :aria-label="`${item.label}占比`"
                :aria-valuenow="item.percent"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <span class="dash-status__fill" :style="{ width: `${item.percent}%` }"></span>
              </div>
            </li>
          </ul>
        </SectionPanel>
      </div>

      <SectionPanel
        title="售罄提醒"
        subtitle="本档口当前不可点的菜品"
        action-label="去处理"
        @action="router.push('/admin/dishes')"
      >
        <div v-if="soldOutDishes.length" class="dash-sold">
          <div v-for="dish in soldOutDishes" :key="dish.id" class="dash-sold__item">
            <img :src="dish.image || `${assetBase}images/fresh-bowl.jpg`" :alt="dish.name" />
            <div>
              <strong>{{ dish.name }}</strong>
              <span>{{ dish.category }} · {{ dish.desc || '暂无菜品说明' }}</span>
            </div>
            <StatusTag type="danger" text="已售罄" size="sm" dot />
          </div>
        </div>
        <EmptyState
          v-else
          title="本档口菜品状态良好"
          detail="当前没有售罄菜品，可以继续安心接单。"
          icon="CircleCheck"
          compact
        />
      </SectionPanel>
    </template>
  </div>
</template>
