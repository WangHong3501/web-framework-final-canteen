<script>
import OrderShell from '@/components/order/OrderShell.vue'
import PhoneFrame from '@/components/ui/PhoneFrame.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { SubmitBar, showConfirmDialog } from 'vant'
import 'vant/es/button/style'
import 'vant/es/dialog/style'
import 'vant/es/submit-bar/style'
import { ordersApi } from '@/api/orders'
import { requestMessage } from '@/api/http'
import { useCartStore } from '@/stores/cart'
import { mealLabel, resolveDishImage } from '@/components/dishes/dish-meta'
import AppIcon from '@/components/ui/AppIcon.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StallPicker from '@/components/order/StallPicker.vue'
export default {
  components: { OrderShell, PhoneFrame, SubmitBar, AppIcon, PriceTag, EmptyState, StallPicker },
  inject: ['compactLayout'],
  data: () => ({ selectedKey: '', remark: '', submitting: false, errorMsg: '' }),
  computed: {
    cart: () => useCartStore(),
    phonePreview() {
      return !this.compactLayout && this.$route.query.preview === 'phone'
    },
    compactCheckout() {
      return this.compactLayout || this.phonePreview
    },
    group() {
      return this.cart.byStall.find((item) => item.key === this.selectedKey) || this.cart.byStall[0]
    },
    mealLabel() {
      return mealLabel(this.cart.meal)
    },
  },
  methods: {
    image(src) {
      return resolveDishImage(src, import.meta.env.BASE_URL)
    },
    async clearCart() {
      try {
        const options = {
          confirmButtonText: '确认清空',
          cancelButtonText: '保留菜品',
        }
        const message = '移除餐车内所有档口的菜品？'
        const title = '清空餐车'
        await (this.compactCheckout
          ? showConfirmDialog({ title, message, ...options })
          : ElMessageBox.confirm(message, title, options))
      } catch {
        return
      }
      this.cart.clear()
      this.errorMsg = ''
    },
    async submitOrder() {
      if (!this.group || this.submitting) return
      this.submitting = true
      this.errorMsg = ''
      const groupKey = this.group.key
      const ownerId = this.cart.ownerId
      const checkoutRoute = this.$route
      try {
        const { payload, key } = this.cart.beginCheckout(this.group, this.remark)
        const order = await ordersApi.create(payload, key)
        if (this.cart.ownerId !== ownerId) return
        this.cart.consume(payload.items, groupKey)
        ElMessage.success('下单成功，正在为你备餐')
        if (this.$route === checkoutRoute) {
          await this.$router.push({ name: 'order-detail', params: { id: order.id } })
        }
      } catch (error) {
        this.errorMsg = requestMessage(error, '下单失败，请稍后重试。')
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<template>
  <component
    :is="phonePreview ? 'PhoneFrame' : 'OrderShell'"
    :class="{ 'cart-preview': phonePreview }"
  >
    <div class="cart-page" :class="{ 'cart-page--compact': compactCheckout }">
      <div class="order-section-head">
        <div>
          <h1>餐车</h1>
        </div>
        <el-button v-if="!cart.isEmpty" :disabled="submitting" @click="clearCart"
          >清空餐车</el-button
        >
      </div>

      <EmptyState
        v-if="cart.isEmpty"
        title="餐车还是空的"
        detail="先去菜单挑几道喜欢的菜，再回来结算吧。"
        action-label="去挑点好吃的"
        icon="ShoppingCart"
        @action="$router.push({ name: phonePreview ? 'mobile-order' : 'menu' })"
      />

      <div v-else class="cart-layout">
        <div class="cart-main">
          <section v-for="group in cart.byStall" :key="group.key" class="stall-block">
            <header class="stall-block__head">
              <span class="stall-block__icon"><AppIcon name="Store" :size="16" /></span>
              <strong>{{ group.stall }}</strong>
              <span class="stall-block__sub">小计 ¥{{ group.subtotal.toFixed(2) }}</span>
            </header>

            <div class="cart-line" v-for="item in group.items" :key="item.dishId">
              <img :src="image(item.image)" :alt="item.name" class="cart-line__img" />
              <div class="cart-line__info">
                <strong>{{ item.name }}</strong>
                <span>¥{{ (item.priceCents / 100).toFixed(2) }} / 份</span>
              </div>
              <div class="qty-stepper">
                <button
                  class="is-minus"
                  type="button"
                  :disabled="submitting"
                  :aria-label="`减少${item.name}`"
                  @click="cart.setQty(item.dishId, item.qty - 1)"
                >
                  <AppIcon name="Minus" :size="14" />
                </button>
                <strong>{{ item.qty }}</strong>
                <button
                  type="button"
                  :disabled="submitting || item.qty >= 20"
                  :aria-label="`增加${item.name}`"
                  @click="cart.setQty(item.dishId, item.qty + 1)"
                >
                  <AppIcon name="Plus" :size="14" />
                </button>
              </div>
              <strong class="cart-line__sum"
                >¥{{ ((item.priceCents * item.qty) / 100).toFixed(2) }}</strong
              >
              <button
                class="cart-line__remove"
                type="button"
                :disabled="submitting"
                :aria-label="`移除${item.name}`"
                @click="cart.remove(item.dishId)"
              >
                <AppIcon name="Trash2" :size="15" />
              </button>
            </div>
          </section>

          <section class="remark-block">
            <label for="cart-remark">备注口味（可选）</label>
            <el-input
              id="cart-remark"
              v-model="remark"
              type="textarea"
              :rows="2"
              maxlength="100"
              show-word-limit
              placeholder="例如：少放辣、不要香菜…"
            />
          </section>
        </div>

        <aside class="cart-summary">
          <h3>订单信息</h3>
          <StallPicker
            :groups="cart.byStall"
            :model-value="group.key"
            :disabled="submitting"
            @update:model-value="selectedKey = $event"
          />
          <div class="summary-row">
            <span>取餐档口</span><strong>{{ group.stall }}</strong>
          </div>
          <div class="summary-row">
            <span>用餐时段</span>
            <strong>{{ mealLabel }}</strong>
          </div>
          <div class="summary-row">
            <span>菜品数量</span>
            <strong>{{ group.count }} 件</strong>
          </div>
          <div class="summary-row">
            <span>备餐时间</span>
            <strong>约 15 分钟</strong>
          </div>
          <div class="summary-divider"></div>
          <div v-if="!compactCheckout" class="summary-total">
            <span>应付合计</span>
            <PriceTag :value="group.subtotal" size="lg" />
          </div>
          <div v-if="errorMsg" class="summary-error" role="alert">
            <AppIcon name="CircleAlert" :size="15" /> {{ errorMsg }}
          </div>
          <SubmitBar
            v-if="compactCheckout"
            class="cart-submit-bar"
            :price="group.subtotalCents"
            :loading="submitting"
            :safe-area-inset-bottom="false"
            label="应付合计"
            button-text="提交订单"
            button-color="var(--forest)"
            @submit="submitOrder"
          />
          <el-button
            v-else
            type="primary"
            class="submit-btn"
            :loading="submitting"
            @click="submitOrder"
          >
            提交订单 · ¥{{ group.subtotal.toFixed(2) }}
          </el-button>
          <p class="summary-hint"><AppIcon name="Info" :size="13" /> 价格以提交时服务端核算为准</p>
        </aside>
      </div>
    </div>
  </component>
</template>

<style scoped>
.cart-page {
  max-width: 1080px;
  margin: 0 auto;
  padding-bottom: var(--space-8);
}
.cart-page .order-section-head {
  margin-top: 0;
}
.cart-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--space-5);
  align-items: start;
}
.cart-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.stall-block,
.remark-block,
.cart-summary {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  box-shadow: var(--shadow-2);
}
.stall-block__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--line);
}
.stall-block__icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--brand-50);
  color: var(--forest);
}
.stall-block__head strong {
  color: var(--ink);
  font-size: var(--fs-15);
}
.stall-block__sub {
  margin-left: auto;
  color: var(--muted);
  font-size: var(--fs-12);
}
.cart-line {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}
.cart-line__img {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: var(--gray-100);
}
.cart-line__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
.cart-line__info strong {
  font-size: var(--fs-14);
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cart-line__info span {
  font-size: var(--fs-12);
  color: var(--muted);
}
.cart-line__sum {
  min-width: 72px;
  text-align: right;
  font-size: var(--fs-14);
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.cart-line__remove {
  border: 0;
  background: transparent;
  color: var(--gray-400);
  padding: 6px;
  border-radius: var(--radius-sm);
}
.cart-line__remove:hover {
  color: var(--danger-600);
  background: var(--danger-100);
}
.remark-block label {
  display: block;
  font-size: var(--fs-13);
  font-weight: var(--fw-medium);
  color: var(--ink);
  margin-bottom: var(--space-2);
}
.cart-summary {
  position: sticky;
  top: calc(var(--workspace-header-height) + var(--space-4));
}
.cart-summary h3 {
  margin: 0 0 var(--space-4);
  font-size: var(--fs-18);
  color: var(--ink);
}
.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  font-size: var(--fs-13);
}
.summary-row span {
  color: var(--muted);
}
.summary-row strong {
  color: var(--ink);
  font-weight: var(--fw-medium);
}
.summary-divider {
  height: 1px;
  background: var(--line);
  margin: var(--space-4) 0;
}
.summary-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}
.summary-total > span {
  font-size: var(--fs-14);
  color: var(--ink);
  font-weight: var(--fw-medium);
}
.summary-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--danger-600);
  background: var(--danger-100);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  font-size: var(--fs-12);
  margin-bottom: var(--space-3);
}
.submit-btn {
  width: 100%;
}
.summary-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: var(--fs-11);
  color: var(--gray-400);
  margin: var(--space-3) 0 0;
}
.cart-preview {
  padding: var(--space-6) var(--space-4);
}
.cart-preview .cart-page {
  padding: var(--space-7) var(--space-3) var(--space-4);
}
.cart-page--compact .cart-layout {
  grid-template-columns: minmax(0, 1fr);
}
.cart-page--compact .stall-block,
.cart-page--compact .remark-block,
.cart-page--compact .cart-summary {
  padding: var(--space-3);
}
.cart-page--compact .cart-summary {
  position: static;
}
.cart-page--compact .cart-line {
  display: grid;
  grid-template-columns: var(--size-control-mobile) minmax(0, 1fr) auto;
  grid-template-areas: 'image info remove' 'image qty sum';
  gap: var(--space-1) var(--space-2);
  border-bottom: 1px solid var(--line);
}
.cart-page--compact .cart-line:last-child {
  border-bottom: 0;
}
.cart-page--compact .cart-line__img {
  grid-area: image;
  width: var(--size-control-mobile);
  height: var(--size-control-mobile);
}
.cart-page--compact .cart-line__info {
  grid-area: info;
}
.cart-page--compact .qty-stepper {
  grid-area: qty;
  justify-self: start;
}
.cart-page--compact .cart-line__sum {
  grid-area: sum;
  min-width: 0;
}
.cart-page--compact .cart-line__remove {
  grid-area: remove;
  justify-self: end;
}
.cart-summary .cart-submit-bar {
  position: static;
  --van-submit-bar-price-color: var(--danger-600);
  --van-submit-bar-text-color: var(--ink);
}
.cart-submit-bar :deep(.van-submit-bar__bar) {
  padding: 0;
  gap: var(--space-2);
}
@media (max-width: 900px) {
  .cart-layout {
    grid-template-columns: 1fr;
  }
  .cart-summary {
    position: static;
  }
}
</style>
