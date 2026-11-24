<script>
import OrderShell from '@/components/order/OrderShell.vue'
import PhoneFrame from '@/components/ui/PhoneFrame.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { SubmitBar, showConfirmDialog } from 'vant'
import 'vant/es/button/style'
import 'vant/es/dialog/style'
import 'vant/es/submit-bar/style'
import { ordersApi } from '@/api/orders'
import { dishesApi } from '@/api/dishes'
import { requestMessage } from '@/api/http'
import { useCartStore } from '@/stores/cart'
import { DISH_MEALS, resolveDishImage } from '@/components/dishes/dish-meta'
import AppIcon from '@/components/ui/AppIcon.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StallPicker from '@/components/order/StallPicker.vue'
export default {
  components: { OrderShell, PhoneFrame, SubmitBar, AppIcon, PriceTag, EmptyState, StallPicker },
  inject: ['compactLayout'],
  data: () => ({
    selectedKey: '',
    remarks: new Map(),
    submitting: false,
    errorMsg: '',
    stalls: [],
    meals: DISH_MEALS.filter((meal) => meal.key !== 'all'),
  }),
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
    pickupSite() {
      const stall = this.stalls.find(
        (item) => item.id === this.group?.key || item.name === this.group?.stall,
      )
      return [stall?.canteen, stall?.window].filter(Boolean).join(' · ')
    },
    remark: {
      get() {
        return this.remarks.get(this.group?.key) || ''
      },
      set(value) {
        if (this.group) this.remarks.set(this.group.key, value)
      },
    },
  },
  async mounted() {
    try {
      const stalls = await dishesApi.stalls()
      this.stalls = Array.isArray(stalls) ? stalls : []
    } catch {
      // 订单提交后仍会返回取餐窗口。
    }
  },
  methods: {
    selectStall(key) {
      this.selectedKey = key
      this.errorMsg = ''
    },
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
      this.remarks.clear()
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
        this.remarks.delete(groupKey)
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
    <div
      class="cart-page"
      :class="{ 'cart-page--compact': compactCheckout, 'cart-page--ready': group }"
    >
      <div class="order-section-head">
        <div>
          <h1>餐车</h1>
          <p v-if="!cart.isEmpty">
            已选 {{ cart.count }} 份，来自 {{ cart.byStall.length }} 个档口
          </p>
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

      <StallPicker
        v-if="cart.byStall.length > 1"
        :groups="cart.byStall"
        :model-value="group.key"
        :disabled="submitting"
        @update:model-value="selectStall"
      />

      <div v-if="group" class="cart-layout">
        <div class="cart-main">
          <section
            v-for="stallGroup in cart.byStall"
            :key="stallGroup.key"
            class="stall-block"
            :class="{ 'stall-block--selected': stallGroup.key === group.key }"
          >
            <header class="stall-block__head">
              <span class="stall-block__icon"><AppIcon name="Store" :size="16" /></span>
              <strong>{{ stallGroup.stall }}</strong>
              <span
                v-if="cart.byStall.length > 1 && stallGroup.key === group.key"
                class="stall-block__state"
                >本次结算</span
              >
              <span class="stall-block__sub">小计 ¥{{ stallGroup.subtotal.toFixed(2) }}</span>
            </header>

            <div class="cart-line" v-for="item in stallGroup.items" :key="item.dishId">
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
        </div>

        <aside class="cart-summary" aria-label="本次订单">
          <h3>本次订单</h3>
          <div class="cart-pickup">
            <AppIcon name="MapPin" :size="18" />
            <div>
              <strong>{{ group.stall }}</strong>
              <p>{{ pickupSite || '档口自取' }}</p>
            </div>
          </div>
          <label class="summary-row summary-row--meal">
            用餐时段
            <select
              :value="cart.meal"
              class="menu-select"
              :disabled="submitting"
              @change="cart.setMeal($event.target.value)"
            >
              <option v-for="meal in meals" :key="meal.key" :value="meal.key">
                {{ meal.label }}
              </option>
            </select>
          </label>
          <div class="remark-block">
            <label for="cart-remark">本单口味备注（可选）</label>
            <el-input
              id="cart-remark"
              v-model="remark"
              type="textarea"
              :rows="2"
              :disabled="submitting"
              maxlength="100"
              show-word-limit
              placeholder="例如：少放辣、不要香菜…"
            />
          </div>
          <div v-if="!compactCheckout" class="summary-total">
            <span>应付合计</span>
            <PriceTag :value="group.subtotal" size="lg" />
          </div>
          <div v-if="errorMsg" class="summary-error" role="alert">
            <AppIcon name="CircleAlert" :size="15" /> {{ errorMsg }}
          </div>
          <el-button
            v-if="!compactCheckout"
            type="primary"
            class="submit-btn"
            :loading="submitting"
            @click="submitOrder"
          >
            提交订单
          </el-button>
          <p class="summary-hint">
            <AppIcon name="Ticket" :size="14" /> 下单后可在订单中查看取餐码
          </p>
        </aside>
      </div>

      <SubmitBar
        v-if="compactCheckout && group"
        class="cart-submit-bar"
        :price="group.subtotalCents"
        :loading="submitting"
        :safe-area-inset-bottom="false"
        label="本单合计"
        button-text="提交订单"
        button-color="var(--forest)"
        @submit="submitOrder"
      >
        <span class="cart-submit-bar__stall">{{ group.stall }}</span>
      </SubmitBar>
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
.cart-summary {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  box-shadow: var(--shadow-2);
}
.stall-block--selected {
  border-color: var(--brand-300);
}
.stall-block__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
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
.stall-block__state {
  padding: 2px var(--space-2);
  border-radius: var(--radius-xs);
  color: var(--forest);
  background: var(--brand-50);
  font-size: var(--fs-11);
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
.remark-block {
  margin: var(--space-4) 0;
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
.cart-pickup {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background: var(--brand-50);
  border-radius: var(--radius-sm);
  color: var(--forest);
}
.cart-pickup p {
  margin: var(--space-1) 0 0;
  color: var(--muted);
  font-size: var(--fs-12);
}
.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  font-size: var(--fs-13);
}
.summary-row--meal {
  align-items: center;
  gap: var(--space-2);
  color: var(--muted);
}
.summary-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  border-top: 1px solid var(--line);
  padding-top: var(--space-3);
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
.cart-page--compact.cart-page--ready {
  padding-bottom: calc(var(--van-submit-bar-height) + var(--space-4));
}
.cart-page--compact .cart-layout {
  grid-template-columns: minmax(0, 1fr);
}
.cart-page--compact .stall-block,
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
.cart-page .cart-submit-bar {
  bottom: var(--workspace-bottom-nav, 0px);
  z-index: var(--z-raised);
  border-top: 1px solid var(--line);
  --van-submit-bar-price-color: var(--danger-600);
  --van-submit-bar-text-color: var(--ink);
}
.cart-preview .cart-page--ready {
  padding-bottom: var(--space-4);
}
.cart-preview .cart-submit-bar {
  position: sticky;
  margin-top: var(--space-4);
}
.cart-submit-bar :deep(.van-submit-bar__bar) {
  padding-inline: var(--space-3);
  gap: var(--space-2);
}
.cart-submit-bar__stall {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--forest);
  font-size: var(--fs-13);
  font-weight: var(--fw-semibold);
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
