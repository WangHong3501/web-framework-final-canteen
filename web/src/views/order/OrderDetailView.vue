<script>
import OrderShell from '@/components/order/OrderShell.vue'
import { ElMessage } from 'element-plus'
import { ordersApi } from '@/api/orders'
import { requestMessage } from '@/api/http'
import { useUserStore } from '@/stores/user'
import { STATUS_LABEL, formatOrderTime } from '@/shared/order'
import { mealLabel, resolveDishImage } from '@/components/dishes/dish-meta'
import AppIcon from '@/components/ui/AppIcon.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import OrderStatusFlow from '@/components/ui/OrderStatusFlow.vue'
import PickupCode from '@/components/ui/PickupCode.vue'
export default {
  components: { OrderShell, AppIcon, PriceTag, OrderStatusFlow, PickupCode },
  data: () => ({
    order: null,
    loading: true,
    errorMsg: '',
    actionError: '',
    acting: false,
    STATUS_LABEL,
  }),
  computed: { user: () => useUserStore() },
  watch: { '$route.params.id': { immediate: true, handler: 'load' } },
  methods: {
    formatTime: formatOrderTime,
    mealLabel,
    image(src) {
      return resolveDishImage(src, import.meta.env.BASE_URL)
    },
    async load() {
      const id = this.$route.params.id
      this.loading = true
      this.order = null
      this.errorMsg = this.actionError = ''
      try {
        const order = await ordersApi.detail(id)
        if (id === this.$route.params.id) this.order = order
      } catch (error) {
        if (id === this.$route.params.id) this.errorMsg = requestMessage(error, '订单加载失败。')
      } finally {
        if (id === this.$route.params.id) this.loading = false
      }
    },
    async save(dishId, stars) {
      if (!this.order || this.acting) return
      const id = this.order.id
      this.acting = true
      this.actionError = ''
      try {
        const updated = dishId
          ? await ordersApi.rate(id, dishId, stars)
          : await ordersApi.confirm(id)
        if (id !== this.$route.params.id) return
        this.order = updated
        ElMessage.success(dishId ? '评价已保存' : '已确认取餐，祝你用餐愉快')
        try {
          const latest = await ordersApi.detail(id)
          if (id === this.$route.params.id) this.order = latest
        } catch (error) {
          if (id === this.$route.params.id)
            this.actionError =
              '已保存。' + requestMessage(error, '最新订单暂时无法读取，请刷新查看。')
        }
      } catch (error) {
        if (id === this.$route.params.id) this.actionError = requestMessage(error)
      } finally {
        this.acting = false
      }
    },
  },
}
</script>

<template>
  <OrderShell>
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
            <h1>{{ STATUS_LABEL[order.status] || '订单' }}</h1>
            <p>订单号 {{ order.id }} · {{ formatTime(order.createdAt) }}</p>
          </div>
          <span class="detail-head__meal">{{ mealLabel(order.meal) }}</span>
        </div>

        <section class="detail-card status-card">
          <OrderStatusFlow :status="order.status" />
          <div v-if="order.status === 'ready' && !user.isMerchant" class="pickup-action">
            <el-button type="primary" round :loading="acting" @click="save()">
              <AppIcon name="PackageCheck" :size="16" /> 我已取餐
            </el-button>
          </div>
        </section>

        <section
          v-if="order.pickupCode && ['preparing', 'ready'].includes(order.status)"
          class="detail-card"
        >
          <PickupCode :code="order.pickupCode" :window="order.window" :eta="order.eta" size="lg" />
        </section>

        <section class="detail-card">
          <h3 class="detail-card__title">菜品明细</h3>
          <div v-for="item in order.items" :key="item.dishId" class="detail-line">
            <img :src="image(item.image)" :alt="item.name" class="detail-line__img" />
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

        <p v-if="actionError" class="error-block" role="alert">{{ actionError }}</p>
        <section v-if="order.status === 'completed' && !user.isMerchant" class="detail-card">
          <h2 class="detail-card__title">给这一餐打分</h2>
          <fieldset
            v-for="item in order.items"
            :key="item.dishId"
            class="rating-line"
            :disabled="acting"
          >
            <legend>{{ item.name }}</legend>
            <div class="rating-options">
              <button
                v-for="stars in 5"
                :key="stars"
                type="button"
                :aria-label="`${item.name} ${stars} 星`"
                :aria-pressed="order.ratings?.[item.dishId] === stars"
                :class="{ filled: stars <= (order.ratings?.[item.dishId] || 0) }"
                @click="save(item.dishId, stars)"
              >
                <span aria-hidden="true">★</span>
              </button>
              <span aria-live="polite">{{
                order.ratings?.[item.dishId]
                  ? `已评 ${order.ratings[item.dishId]} 星`
                  : '请选择星级'
              }}</span>
            </div>
          </fieldset>
        </section>
        <section v-if="order.remark" class="detail-card remark-card">
          <h3 class="detail-card__title">口味备注</h3>
          <p>{{ order.remark }}</p>
        </section>
      </template>
    </div>
  </OrderShell>
</template>

<style scoped>
.rating-line {
  border: 0;
  padding: 0;
  margin: 12px 0;
}
.rating-line legend {
  color: var(--ink);
  font-weight: 600;
}
.rating-options {
  display: flex;
  align-items: center;
  gap: 2px;
}
.rating-options button {
  background: transparent;
  color: var(--muted);
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 24px;
  width: 38px;
  height: 40px;
}
.rating-options button.filled {
  color: #88540d;
  background: var(--warning-100);
}
.rating-options span[aria-live] {
  color: var(--muted);
  margin-left: 8px;
  font-size: 13px;
}

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
.detail-head h1 {
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
