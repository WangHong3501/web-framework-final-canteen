<script>
import '@/styles/order.css'
import '@/styles/mobile.css'
import {
  Search,
  Stepper,
  Button,
  Dialog,
  Field,
  Tag,
  Tabs,
  Tab,
  SubmitBar,
  showToast,
  showConfirmDialog,
} from 'vant'
import 'vant/es/search/style'
import 'vant/es/stepper/style'
import 'vant/es/button/style'
import 'vant/es/dialog/style'
import 'vant/es/field/style'
import 'vant/es/tag/style'
import 'vant/es/tabs/style'
import 'vant/es/submit-bar/style'
import 'vant/es/toast/style'
import { dishesApi } from '@/api/dishes'
import { ordersApi } from '@/api/orders'
import { requestMessage } from '@/api/http'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import {
  DISH_MEALS,
  filterDishList,
  isDishSoldOut,
  mealLabel,
  resolveDishImage,
} from '@/components/dishes/dish-meta'
import { STATUS_LABEL, formatOrderTime } from '@/shared/order'
import StallPicker from '@/components/order/StallPicker.vue'
import PhoneFrame from '@/components/ui/PhoneFrame.vue'
import StatusTag from '@/components/ui/StatusTag.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import OrderStatusFlow from '@/components/ui/OrderStatusFlow.vue'
import PickupCode from '@/components/ui/PickupCode.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import MobileTabBar from '@/components/ui/MobileTabBar.vue'

// Vant 4 的 Stepper 仅向外层转发属性，分别命名三个原生控件。
function nameQuantityControls(root, { value: dish }) {
  root.querySelector('.van-stepper__minus')?.setAttribute('aria-label', `减少${dish}`)
  root.querySelector('.van-stepper__plus')?.setAttribute('aria-label', `增加${dish}`)
  root.querySelector('input')?.setAttribute('aria-label', `${dish}份数`)
}
export default {
  directives: { quantityLabels: { mounted: nameQuantityControls, updated: nameQuantityControls } },
  components: {
    Search,
    Stepper,
    Button,
    Dialog,
    Field,
    Tag,
    Tabs,
    Tab,
    SubmitBar,
    StallPicker,
    PhoneFrame,
    StatusTag,
    PriceTag,
    OrderStatusFlow,
    PickupCode,
    AppIcon,
    MobileTabBar,
  },
  data: () => ({
    dishes: [],
    orders: [],
    loading: true,
    ordersLoading: false,
    loadError: '',
    orderError: '',
    activeNav: 'order',
    remark: '',
    confirmShow: false,
    submitting: false,
    acting: '',
    checkoutError: '',
    selectedKey: '',
    meal: useCartStore().meal,
    category: '全部',
    keyword: '',
    meals: DISH_MEALS,
    STATUS_LABEL,
  }),
  computed: {
    cart: () => useCartStore(),
    user: () => useUserStore(),
    categories() {
      return [
        '全部',
        ...new Set(filterDishList(this.dishes, { meal: this.meal }).map((dish) => dish.category)),
      ]
    },
    filtered() {
      return filterDishList(this.dishes, {
        meal: this.meal,
        category: this.category,
        keyword: this.keyword,
      })
    },
    mealLabel() {
      return mealLabel(this.cart.meal)
    },
    group() {
      return this.cart.byStall.find((item) => item.key === this.selectedKey) || this.cart.byStall[0]
    },
  },
  watch: {
    meal(value) {
      if (value !== 'all') this.cart.setMeal(value)
      this.category = '全部'
    },
  },
  mounted() {
    this.load()
  },
  methods: {
    soldOut: isDishSoldOut,
    formatTime: formatOrderTime,
    image(src) {
      return resolveDishImage(src, import.meta.env.BASE_URL)
    },
    qtyOf(id) {
      return this.cart.items.find((i) => i.dishId === id)?.qty || 0
    },
    resetFilters() {
      this.category = '全部'
      this.keyword = ''
      this.meal = 'all'
    },
    async load() {
      this.loading = true
      this.loadError = ''
      try {
        this.dishes = await dishesApi.list()
      } catch (error) {
        this.loadError = requestMessage(error, '菜单加载失败，请重试。')
      } finally {
        this.loading = false
      }
    },
    async loadOrders() {
      this.orderError = ''
      this.ordersLoading = true
      try {
        this.orders = await ordersApi.list()
      } catch (error) {
        this.orderError = requestMessage(error, '订单加载失败，请重试。')
      } finally {
        this.ordersLoading = false
      }
    },
    onStep(dish, value) {
      const qty = Number(value)
      if (this.qtyOf(dish.id)) this.cart.setQty(dish.id, qty)
      else if (qty > 0) this.cart.add(dish, qty)
    },
    openConfirm() {
      if (this.cart.isEmpty) return showToast('餐车还是空的，先选几道菜吧')
      this.checkoutError = ''
      this.confirmShow = true
    },
    async clearCart() {
      try {
        await showConfirmDialog({
          title: '清空餐车',
          message: '移除所有档口的菜品？',
          confirmButtonText: '确认清空',
          cancelButtonText: '保留菜品',
        })
      } catch {
        return
      }
      this.cart.clear()
      this.confirmShow = false
    },
    async submitOrder() {
      if (!this.group || this.submitting) return
      this.submitting = true
      this.checkoutError = ''
      const groupKey = this.group.key
      try {
        const { payload, key } = this.cart.beginCheckout(this.group, this.remark)
        await ordersApi.create(payload, key)
        this.cart.consume(payload.items, groupKey)
        this.remark = ''
        this.confirmShow = false
        this.activeNav = 'orders'
        showToast({ message: '下单成功，正在备餐', type: 'success' })
        await this.loadOrders()
      } catch (error) {
        this.checkoutError = requestMessage(error, '下单失败，请重试。')
      } finally {
        this.submitting = false
      }
    },
    async confirmPickup(order) {
      if (this.acting) return
      this.acting = order.id
      try {
        await ordersApi.confirm(order.id)
        await this.loadOrders()
        showToast('已确认取餐')
      } catch (error) {
        showToast(requestMessage(error))
      } finally {
        this.acting = ''
      }
    },
    onNavigate(key) {
      if (key === 'cart') return this.openConfirm()
      if (key === 'mine') return this.$router.push('/center/overview')
      this.activeNav = key
      if (key === 'orders') this.loadOrders()
      this.$refs.scrollBox?.scrollTo(0, 0)
    },
  },
}
</script>

<template>
  <div class="mobile-order-page">
    <header class="m-header">
      <div>
        <span class="m-header__eyebrow">食光校园</span>
        <h1>校园点餐</h1>
      </div>
      <router-link to="/menu" class="back-link">返回校园菜单</router-link>
    </header>

    <PhoneFrame :inert="confirmShow" label="手机点餐">
      <div class="m-scroll" ref="scrollBox" :inert="confirmShow">
        <!-- 点餐页 -->
        <div v-show="activeNav === 'order'" class="m-pane">
          <section class="m-hero">
            <span class="m-hero__eyebrow">{{ user.user?.canteen || '校园食堂' }}</span>
            <h2>今天吃什么？</h2>
            <p>选好菜品，按档口下单，凭码取餐。</p>
          </section>

          <div class="m-controls">
            <Search
              v-model="keyword"
              aria-label="搜索菜名或档口"
              placeholder="搜索菜名或档口…"
              shape="round"
              background="transparent"
              class="m-search"
            />
            <Tabs
              v-model:active="meal"
              class="meal-tabs"
              aria-label="餐次"
              color="var(--forest)"
              title-active-color="var(--forest)"
            >
              <Tab v-for="item in meals" :key="item.key" :name="item.key" :title="item.label"
                ><span class="sr-only">{{ item.label }}菜单</span></Tab
              >
            </Tabs>
            <div class="m-categories">
              <button
                v-for="cat in categories"
                :key="cat"
                type="button"
                class="m-chip"
                :aria-pressed="cat === category"
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
                <img :src="image(dish.image)" :alt="dish.name" loading="lazy" />
                <div v-if="dish.badges?.length" class="m-dish__badges">
                  <span v-for="badge in dish.badges" :key="badge" class="m-dish__badge">{{
                    badge
                  }}</span>
                </div>
                <div v-if="soldOut(dish)" class="m-dish__mask">今日售罄</div>
              </div>
              <div class="m-dish__body">
                <h3>{{ dish.name }}</h3>
                <p class="m-dish__desc">{{ dish.desc }}</p>
                <div class="m-dish__tags">
                  <StatusTag
                    v-if="dish.spice"
                    type="hot"
                    size="sm"
                    :text="dish.spice === 3 ? '特辣' : dish.spice === 2 ? '中辣' : '微辣'"
                  />
                  <StatusTag
                    v-for="tag in dish.tags"
                    :key="tag.text"
                    :type="tag.type"
                    size="sm"
                    :text="tag.text"
                  />
                </div>
                <div class="m-dish__bottom">
                  <PriceTag :value="dish.price" :original="dish.originalPrice" size="md" />
                  <Stepper
                    v-quantity-labels="dish.name"
                    v-if="!soldOut(dish)"
                    :model-value="qtyOf(dish.id)"
                    min="0"
                    :max="20"
                    :name="dish.name"
                    :aria-label="`${dish.name}份数`"
                    theme="round"
                    button-size="28"
                    icon-size="14"
                    @change="(v) => onStep(dish, v)"
                  />
                  <span v-else class="m-dish__sold">明日再来</span>
                </div>
              </div>
            </article>
            <p class="m-list-end">共 {{ filtered.length }} 道菜品</p>
          </template>

          <div v-else class="m-state">
            <AppIcon name="Search" :size="24" />
            <p>换个条件试试看</p>
            <Button size="small" @click="resetFilters">重置筛选</Button>
          </div>
        </div>

        <!-- 订单页 -->
        <div v-show="activeNav === 'orders'" class="m-pane">
          <div v-if="orderError" class="m-state" role="alert">
            <p>{{ orderError }}</p>
            <Button @click="loadOrders">重新加载订单</Button>
          </div>
          <div v-else-if="ordersLoading" class="m-state" role="status">正在加载订单…</div>
          <div class="m-orders" v-else-if="orders.length">
            <article v-for="order in orders" :key="order.id" class="m-order">
              <div class="m-order__head">
                <div>
                  <strong>{{ order.stallName || '取餐订单' }}</strong><span>{{ order.id }}</span>
                  <span>{{ formatTime(order.createdAt) }}</span>
                </div>
                <Tag type="primary" round>{{ STATUS_LABEL[order.status] }}</Tag>
              </div>
              <div class="m-order__items">
                <img
                  v-for="item in order.items.slice(0, 3)"
                  :key="item.dishId"
                  :src="image(item.image)"
                  :alt="item.name"
                />
                <span>{{ order.items.map((i) => `${i.name}×${i.qty}`).join('、') }}</span>
              </div>
              <OrderStatusFlow :status="order.status" compact />
              <PickupCode
                v-if="['preparing', 'ready'].includes(order.status)"
                :code="order.pickupCode || '—'"
                :window="order.window"
                :eta="order.eta"
                size="sm"
              />
              <div class="m-order__foot">
                <PriceTag :value="order.total" size="md" />
                <router-link :to="{ name: 'order-detail', params: { id: order.id } }">{{
                  order.status === 'completed' ? '查看或评价' : '查看详情'
                }}</router-link>
                <Button
                  v-if="order.status === 'ready'"
                  type="primary"
                  size="small"
                  round
                  :loading="acting === order.id"
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
      <MobileTabBar
        :inert="confirmShow"
        :active="activeNav"
        :cart-count="cart.count"
        @navigate="onNavigate"
      />

      <Transition name="bar">
        <SubmitBar
          :inert="confirmShow"
          v-if="cart.count && activeNav === 'order'"
          class="m-submit-bar"
          :price="cart.totalCents"
          button-text="去结算"
          button-color="var(--forest)"
          @submit="openConfirm"
        >
          <span class="basket-count">{{ cart.count }} 份</span>
        </SubmitBar>
      </Transition>

      <Dialog
        v-model:show="confirmShow"
        teleport="body"
        aria-modal="true"
        aria-label="确认订单"
        aria-labelledby="checkout-title"
        :show-cancel-button="false"
        :show-confirm-button="false"
        class="m-confirm"
      >
        <template #title><span id="checkout-title">确认订单</span></template>
        <div v-if="group" class="m-confirm__body">
          <div class="m-dialog-actions">
            <Button size="small" :disabled="submitting" @click="clearCart">清空餐车</Button
            ><Button size="small" :disabled="submitting" @click="confirmShow = false"
              >继续选菜</Button
            >
          </div>
          <StallPicker
            :groups="cart.byStall"
            :model-value="group.key"
            :disabled="submitting"
            @update:model-value="selectedKey = $event"
          />
          <div class="m-confirm__meal">
            <span>用餐时段</span>
            <strong>{{ mealLabel }}</strong>
          </div>
          <div class="m-confirm__group">
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
            label="口味备注"
            placeholder="例如少放辣…"
            class="m-confirm__remark"
          />
          <div class="m-confirm__total">
            <span>应付合计</span>
            <PriceTag :value="group.subtotal" size="lg" />
          </div>
          <p v-if="checkoutError" role="alert">{{ checkoutError }}</p>
          <Button type="primary" block round :loading="submitting" @click="submitOrder">
            提交订单
          </Button>
        </div>
      </Dialog>
    </PhoneFrame>
  </div>
</template>
