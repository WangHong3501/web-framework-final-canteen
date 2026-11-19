<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ordersApi } from '@/api/orders'
import { catalogApi } from '@/api/catalog'
import { requestMessage } from '@/api/http'
import { useUserStore } from '@/stores/user'
import AppIcon from '@/components/ui/AppIcon.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import OrderStatusFlow from '@/components/ui/OrderStatusFlow.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const router = useRouter()
const user = useUserStore()
const orders = ref([])
const suggestions = ref([])
const loading = ref(true)
const errorMsg = ref('')
const actingId = ref('')
const filter = ref('all')

const STATUS_LABEL = {
  pending: '待支付', preparing: '备餐中', ready: '待取餐', completed: '已完成', refunded: '已退款',
}
const STATUS_TYPE = {
  pending: 'warning', preparing: 'info', ready: 'brand', completed: 'success', refunded: 'sold',
}
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '进行中' },
  { key: 'completed', label: '已完成' },
]

const visibleOrders = computed(() => {
  const list = [...orders.value].reverse()
  if (filter.value === 'active') return list.filter((o) => ['preparing', 'ready'].includes(o.status))
  if (filter.value === 'completed') return list.filter((o) => o.status === 'completed')
  return list
})
const activeCount = computed(() => orders.value.filter((o) => ['preparing', 'ready'].includes(o.status)).length)

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    orders.value = await ordersApi.list()
  } catch (error) {
    errorMsg.value = requestMessage(error, '订单加载失败。')
  } finally {
    loading.value = false
  }
}

// 空订单页不再大片留白：补一条真实菜品推荐，只读，不影响订单逻辑。
async function loadSuggestions() {
  try {
    const list = await catalogApi.dishes()
    suggestions.value = (Array.isArray(list) ? list : [])
      .filter((dish) => dish.status !== 'danger' && !dish.soldOut)
      .slice(0, 8)
  } catch {
    suggestions.value = []
  }
}

async function advance(order) {
  actingId.value = order.id
  try {
    const updated = await ordersApi.advance(order.id)
    const idx = orders.value.findIndex((o) => o.id === order.id)
    if (idx >= 0) orders.value[idx] = updated
    ElMessage.success('订单状态已更新')
  } catch (error) {
    ElMessage.error(requestMessage(error))
  } finally {
    actingId.value = ''
  }
}

async function confirm(order) {
  actingId.value = order.id
  try {
    const updated = await ordersApi.confirm(order.id)
    const idx = orders.value.findIndex((o) => o.id === order.id)
    if (idx >= 0) orders.value[idx] = updated
    ElMessage.success('已确认取餐')
  } catch (error) {
    ElMessage.error(requestMessage(error))
  } finally {
    actingId.value = ''
  }
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

onMounted(() => {
  load()
  loadSuggestions()
})
</script>

<template>
  <div class="orders-page">
    <div class="order-section-head">
      <div>
        <h2>{{ user.isMerchant ? '订单工作台' : '我的订单' }}</h2>
        <p>{{ user.isMerchant ? `当前 ${activeCount} 笔订单进行中` : '每一餐的好食光，都值得记住' }}</p>
      </div>
      <el-button v-if="!user.isMerchant" type="primary" @click="$router.push('/menu')">
        <AppIcon name="Plus" :size="16" /> 再点一单
      </el-button>
    </div>

    <div class="filter-row">
      <button
        v-for="f in FILTERS"
        :key="f.key"
        type="button"
        class="category-chip"
        :class="{ 'is-active': filter === f.key }"
        @click="filter = f.key"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="loading" class="loading-block">正在加载订单…</div>
    <div v-else-if="errorMsg" class="error-block" role="alert">
      <AppIcon name="CircleAlert" :size="22" />
      <p>{{ errorMsg }}</p>
      <el-button @click="load">重试</el-button>
    </div>
    <template v-else-if="!visibleOrders.length">
      <EmptyState
        :title="filter === 'all' ? '还没有订单记录' : '这个分类下没有订单'"
        :detail="filter === 'all' ? '去菜单挑几道喜欢的菜，开启今天的好食光。' : '换个筛选条件看看，或去菜单再点一单。'"
        action-label="去点餐"
        icon="ReceiptText"
        @action="$router.push('/menu')"
      />

      <section v-if="suggestions.length" class="suggest-strip" aria-label="今日推荐菜品">
        <div class="suggest-strip__head">
          <div>
            <h3>{{ user.isMerchant ? '本档口今日菜品' : '今天吃点好的' }}</h3>
            <p>{{ user.isMerchant ? '菜品状态一目了然，方便随时调整。' : '还没想好吃什么？先看看大家常点的几道。' }}</p>
          </div>
          <button type="button" class="suggest-strip__more" @click="router.push('/menu')">
            {{ user.isMerchant ? '查看菜品' : '看看全部菜品' }}
            <AppIcon name="ArrowRight" :size="16" />
          </button>
        </div>
        <div class="suggest-strip__grid">
          <button
            v-for="dish in suggestions"
            :key="dish.id"
            type="button"
            class="suggest-card"
            @click="router.push({ name: 'dish-detail', params: { id: dish.id } })"
          >
            <img :src="dish.image" :alt="dish.name" />
            <span class="suggest-card__body">
              <strong>{{ dish.name }}</strong>
              <PriceTag :value="dish.price" size="sm" />
            </span>
          </button>
        </div>
      </section>
    </template>

    <div v-else class="order-list">
      <article v-for="order in visibleOrders" :key="order.id" class="order-row">
        <div class="order-row__head">
          <div class="order-row__id">
            <strong>{{ order.id }}</strong>
            <span>{{ formatTime(order.createdAt) }}</span>
          </div>
          <span class="order-row__status" :class="`st-${STATUS_TYPE[order.status]}`">
            {{ STATUS_LABEL[order.status] }}
          </span>
        </div>

        <div class="order-row__body">
          <div class="order-row__thumbs">
            <img v-for="item in order.items.slice(0, 4)" :key="item.dishId" :src="item.image" :alt="item.name" />
            <span v-if="order.items.length > 4" class="more">+{{ order.items.length - 4 }}</span>
          </div>
          <div class="order-row__desc">
            {{ order.items.map((i) => `${i.name}×${i.qty}`).join('、') }}
          </div>
          <PriceTag :value="order.total" size="md" />
        </div>

        <OrderStatusFlow :status="order.status" compact />

        <div class="order-row__foot">
          <span v-if="order.pickupCode && ['preparing', 'ready'].includes(order.status)" class="pickup-inline">
            <AppIcon name="Ticket" :size="15" /> 取餐码 <strong>{{ order.pickupCode }}</strong>
          </span>
          <span v-else></span>
          <div class="order-row__actions">
            <el-button size="small" text @click="router.push({ name: 'order-detail', params: { id: order.id } })">
              查看详情
            </el-button>
            <el-button
              v-if="user.isMerchant && ['pending', 'preparing', 'ready'].includes(order.status)"
              size="small"
              type="primary"
              :loading="actingId === order.id"
              @click="advance(order)"
            >
              推进状态
            </el-button>
            <el-button
              v-if="!user.isMerchant && order.status === 'ready'"
              size="small"
              type="primary"
              :loading="actingId === order.id"
              @click="confirm(order)"
            >
              我已取餐
            </el-button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.orders-page {
  max-width: 940px;
  margin: 0 auto;
  padding-bottom: var(--space-8);
}
.filter-row {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}
.category-chip {
  padding: 7px 18px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--fs-13);
  font-weight: var(--fw-medium);
  transition: all var(--dur-fast) var(--ease-out);
}
.category-chip.is-active {
  background: var(--forest);
  border-color: var(--forest);
  color: var(--white);
}
.loading-block,
.error-block {
  display: grid;
  place-items: center;
  gap: var(--space-3);
  padding: var(--space-9);
  color: var(--muted);
}
.error-block {
  color: var(--danger-600);
}
.order-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.order-row {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  box-shadow: var(--shadow-2);
  transition: box-shadow var(--dur-base) var(--ease-out);
}
.order-row:hover {
  box-shadow: var(--shadow-3);
}
.order-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--line);
}
.order-row__id {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}
.order-row__id strong {
  font-size: var(--fs-14);
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.order-row__id span {
  font-size: var(--fs-12);
  color: var(--gray-400);
}
.order-row__status {
  padding: 3px 12px;
  border-radius: var(--radius-xs);
  font-size: var(--fs-12);
  font-weight: var(--fw-medium);
}
.st-warning { color: var(--warning-600); background: var(--warning-100); }
.st-info { color: var(--info-600); background: var(--info-100); }
.st-brand { color: var(--sem-brand); background: var(--sem-brand-bg); }
.st-success { color: var(--success-600); background: var(--success-100); }
.st-sold { color: var(--white); background: var(--sem-sold); }
.order-row__body {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) 0;
}
.order-row__thumbs {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.order-row__thumbs img {
  width: 46px;
  height: 46px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--gray-100);
}
.order-row__thumbs .more {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--gray-100);
  color: var(--muted);
  font-size: var(--fs-12);
}
.order-row__desc {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-13);
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-row__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
}
.pickup-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-12);
  color: var(--muted);
}
.pickup-inline strong {
  font-family: var(--font-mono);
  font-size: var(--fs-16);
  color: var(--forest);
  letter-spacing: 0.1em;
}
.order-row__actions {
  display: flex;
  gap: var(--space-2);
}

/* 空订单页的真实菜品推荐：补足图片与内容密度 */
.suggest-strip {
  margin-top: var(--space-2);
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2);
}
.suggest-strip__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.suggest-strip__head h3 {
  margin: 0 0 4px;
  font-size: var(--fs-18);
  font-weight: var(--fw-semibold);
  color: var(--ink);
}
.suggest-strip__head p {
  margin: 0;
  font-size: var(--fs-13);
  color: var(--muted);
}
.suggest-strip__more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  padding: 8px 14px;
  border: 1px solid var(--brand-200);
  border-radius: var(--radius-pill);
  background: var(--brand-50);
  color: var(--forest);
  font-size: var(--fs-13);
  font-weight: var(--fw-medium);
  cursor: pointer;
}
.suggest-strip__more:focus-visible,
.suggest-card:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 3px;
}
.suggest-strip__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}
.suggest-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--gray-50);
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}
.suggest-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-3);
}
.suggest-card img {
  width: 100%;
  height: 124px;
  object-fit: cover;
  background: var(--gray-100);
}
.suggest-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-3);
}
.suggest-card strong {
  font-size: var(--fs-13);
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 760px) {
  .suggest-strip__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .suggest-strip__head {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 680px) {
  .order-row {
    padding: var(--space-4);
  }
  .order-row__body {
    flex-wrap: wrap;
  }
}
</style>
