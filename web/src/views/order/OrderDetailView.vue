<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ordersApi } from '@/api/orders'
import { requestMessage } from '@/api/http'
import { useUserStore } from '@/stores/user'
import AppIcon from '@/components/ui/AppIcon.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import OrderStatusFlow from '@/components/ui/OrderStatusFlow.vue'
import PickupCode from '@/components/ui/PickupCode.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const user = useUserStore()
const order = ref(null)
const loading = ref(true)
const errorMsg = ref('')
const acting = ref(false)

const STATUS_LABEL = {
  pending: '待支付',
  preparing: '备餐中',
  ready: '待取餐',
  completed: '已完成',
  refunded: '已退款',
}
const MEAL_LABEL = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', night: '夜宵' }

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    order.value = await ordersApi.detail(route.params.id)
  } catch (error) {
    errorMsg.value = requestMessage(error, '订单加载失败。')
  } finally {
    loading.value = false
  }
}

async function confirmPickup() {
  if (!order.value || acting.value) return
  acting.value = true
  try {
    order.value = await ordersApi.confirm(order.value.id)
    ElMessage.success('已确认取餐，祝你用餐愉快')
  } catch (error) {
    ElMessage.error(requestMessage(error))
  } finally {
    acting.value = false
  }
}

function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(load)
</script>

<template>
  <div class="order-detail-page">
    <button type="button" class="back-link" @click="$router.push('/orders')">
      <AppIcon name="ArrowLeft" :size="17" /> 返回订单列表
    </button>

    <div v-if="loading" class="loading-block">正在加载订单…</div>

    <div v-else-if="errorMsg || !order" class="error-block" role="alert">
      <AppIcon name="CircleAlert" :size="22" />
      <p>{{ errorMsg || '未找到这笔订单' }}</p>
      <el-button @click="load">重试</el-button>
    </div>

    <template v-else>
      <div class="detail-head">
        <div>
          <h2>{{ STATUS_LABEL[order.status] || '订单' }}</h2>
          <p>订单号 {{ order.id }} · {{ formatTime(order.createdAt) }}</p>
        </div>
        <span class="detail-head__meal">{{ MEAL_LABEL[order.meal] || '正餐' }}</span>
      </div>

      <section class="detail-card status-card">
        <OrderStatusFlow :status="order.status" />
        <div v-if="order.status === 'ready' && !user.isMerchant" class="pickup-action">
          <el-button type="primary" round :loading="acting" @click="confirmPickup">
            <AppIcon name="PackageCheck" :size="16" /> 我已取餐
          </el-button>
        </div>
      </section>

      <section v-if="order.status !== 'pending' && order.status !== 'refunded'" class="detail-card">
        <PickupCode
          :code="order.pickupCode"
          :window="order.window"
          :eta="order.eta"
          size="lg"
        />
      </section>

      <section class="detail-card">
        <h3 class="detail-card__title">菜品明细</h3>
        <div v-for="item in order.items" :key="item.dishId" class="detail-line">
          <img :src="item.image" :alt="item.name" class="detail-line__img" />
          <div class="detail-line__info">
            <strong>{{ item.name }}</strong>
            <span>¥{{ item.price.toFixed(2) }} × {{ item.qty }}</span>
          </div>
          <strong class="detail-line__sum">¥{{ (item.price * item.qty).toFixed(2) }}</strong>
        </div>
        <div class="detail-total">
          <span>实付合计</span>
          <PriceTag :value="order.total" size="lg" />
        </div>
      </section>

      <section v-if="order.remark" class="detail-card remark-card">
        <h3 class="detail-card__title">口味备注</h3>
        <p>{{ order.remark }}</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.order-detail-page {
  max-width: 820px;
  margin: 0 auto;
  padding-bottom: var(--space-8);
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: var(--fs-13);
  padding: 0;
  margin: var(--space-2) 0 var(--space-5);
}
.back-link:hover {
  color: var(--forest);
}
.loading-block,
.error-block {
  display: grid;
  place-items: center;
  gap: var(--space-3);
  padding: var(--space-9);
  color: var(--muted);
  font-size: var(--fs-14);
}
.error-block {
  color: var(--danger-600);
}
.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.detail-head h2 {
  margin: 0 0 6px;
  font-size: var(--fs-24);
  color: var(--ink);
}
.detail-head p {
  margin: 0;
  font-size: var(--fs-13);
  color: var(--muted);
}
.detail-head__meal {
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: var(--brand-50);
  color: var(--forest);
  font-size: var(--fs-12);
  font-weight: var(--fw-medium);
}
.detail-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
  box-shadow: var(--shadow-2);
}
.status-card {
  padding: var(--space-5) var(--space-5) var(--space-4);
}
.pickup-action {
  display: flex;
  justify-content: center;
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}
.detail-card__title {
  margin: 0 0 var(--space-4);
  font-size: var(--fs-16);
  color: var(--ink);
}
.detail-line {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}
.detail-line__img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: var(--radius-md);
  background: var(--gray-100);
}
.detail-line__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}
.detail-line__info strong {
  font-size: var(--fs-14);
  color: var(--ink);
}
.detail-line__info span {
  font-size: var(--fs-12);
  color: var(--muted);
}
.detail-line__sum {
  font-size: var(--fs-14);
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.detail-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  border-top: 1px solid var(--line);
  margin-top: var(--space-3);
  padding-top: var(--space-4);
  font-size: var(--fs-14);
  color: var(--ink);
  font-weight: var(--fw-medium);
}
.remark-card p {
  margin: 0;
  color: var(--muted);
  font-size: var(--fs-13);
  line-height: 1.6;
}
</style>
