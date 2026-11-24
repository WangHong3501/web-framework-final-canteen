<script>
import '@/styles/mobile.css'
import { Button, Search, Stepper, SubmitBar, Tab, Tabs } from 'vant'
import 'vant/es/button/style'
import 'vant/es/search/style'
import 'vant/es/stepper/style'
import 'vant/es/submit-bar/style'
import 'vant/es/tabs/style'
import { useCartStore } from '@/stores/cart'
import {
  DEFAULT_CUISINE,
  DISH_MEALS,
  dishSavingsLabel,
  isDishSoldOut,
  resolveDishImage,
  statusLabel,
} from '@/components/dishes/dish-meta'
import PhoneFrame from '@/components/ui/PhoneFrame.vue'
import StatusTag from '@/components/ui/StatusTag.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import MenuResults from '@/components/dishes/MenuResults.vue'

// Vant 的 Stepper 将属性转发到外层，这里为原生控件提供独立名称。
function nameQuantityControls(root, { value: dish }) {
  root.querySelector('.van-stepper__minus')?.setAttribute('aria-label', `减少${dish}`)
  root.querySelector('.van-stepper__plus')?.setAttribute('aria-label', `增加${dish}`)
  root.querySelector('input')?.setAttribute('aria-label', `${dish}份数`)
}

export default {
  directives: { quantityLabels: { mounted: nameQuantityControls, updated: nameQuantityControls } },
  components: {
    Button,
    Search,
    Stepper,
    SubmitBar,
    Tab,
    Tabs,
    PhoneFrame,
    StatusTag,
    PriceTag,
    AppIcon,
    MenuResults,
  },
  props: {
    preview: Boolean,
    dishes: { type: Array, required: true },
    stalls: { type: Array, required: true },
    categories: { type: Array, required: true },
    cuisines: { type: Array, required: true },
    meal: { type: String, required: true },
    stallId: { type: String, required: true },
    category: { type: String, required: true },
    cuisine: { type: String, required: true },
    keyword: { type: String, required: true },
    hasFilters: Boolean,
    onlyOffers: Boolean,
    offerCount: { type: Number, required: true },
    pickupLabel: { type: String, required: true },
    detailDestination: { type: Function, required: true },
    loading: Boolean,
    loadError: { type: String, default: '' },
  },
  emits: [
    'update:meal',
    'update:stallId',
    'update:category',
    'update:cuisine',
    'update:keyword',
    'update:onlyOffers',
    'update-quantity',
    'retry',
    'reset',
  ],
  data: () => ({ meals: DISH_MEALS, defaultCuisine: DEFAULT_CUISINE }),
  computed: {
    cart: () => useCartStore(),
  },
  methods: {
    soldOut: isDishSoldOut,
    savingsLabel: dishSavingsLabel,
    statusText: statusLabel,
    image(src) {
      return resolveDishImage(src, import.meta.env.BASE_URL)
    },
    qtyOf(id) {
      return this.cart.items.find((item) => item.dishId === id)?.qty || 0
    },
    checkout() {
      return this.$router.push({ name: 'cart', query: this.preview ? { preview: 'phone' } : {} })
    },
  },
}
</script>

<template>
  <component
    :is="preview ? 'PhoneFrame' : 'div'"
    class="mobile-order-page"
    :class="{ 'mobile-order-page--preview': preview }"
  >
    <div class="mobile-menu" :class="{ 'mobile-menu--has-cart': cart.count > 0 }">
      <div class="mobile-menu__heading">
        <div>
          <h1>今日菜单</h1>
          <p class="menu-pickup-label"><AppIcon name="MapPin" :size="14" />{{ pickupLabel }}</p>
        </div>
        <button
          v-if="hasFilters && dishes.length"
          type="button"
          class="text-button"
          @click="$emit('reset')"
        >
          清除筛选
        </button>
      </div>

      <div class="m-controls">
        <Search
          :model-value="keyword"
          aria-label="搜索菜名、档口或描述"
          placeholder="搜索菜名、档口或描述"
          shape="round"
          background="transparent"
          class="m-search"
          @update:model-value="$emit('update:keyword', $event)"
        />
        <Tabs
          :active="meal"
          class="meal-tabs"
          aria-label="餐次"
          :lazy-render="false"
          color="var(--forest)"
          title-active-color="var(--forest)"
          @update:active="$emit('update:meal', $event)"
        >
          <Tab v-for="item in meals" :key="item.key" :name="item.key" :title="item.label">
            <span class="sr-only">{{ item.label }}菜单</span>
          </Tab>
        </Tabs>
        <div class="m-selects">
          <select
            :value="stallId"
            class="menu-select"
            aria-label="食堂档口"
            @change="$emit('update:stallId', $event.target.value)"
          >
            <option value="all">全部档口</option>
            <option v-for="stall in stalls" :key="stall.id" :value="stall.id">
              {{ stall.name }}
            </option>
          </select>
          <select
            :value="cuisine"
            class="menu-select"
            aria-label="菜系"
            @change="$emit('update:cuisine', $event.target.value)"
          >
            <option value="全部">全部菜系</option>
            <option v-for="item in cuisines" :key="item" :value="item">{{ item }}</option>
          </select>
          <select
            :value="category"
            class="menu-select"
            aria-label="菜品分类"
            @change="$emit('update:category', $event.target.value)"
          >
            <option v-for="cat in categories" :key="cat" :value="cat">
              {{ cat === '全部' ? '全部分类' : cat }}
            </option>
          </select>
        </div>
      </div>

      <MenuResults
        v-if="!loading && !loadError"
        :count="dishes.length"
        :offers="offerCount"
        :model-value="onlyOffers"
        @update:model-value="$emit('update:onlyOffers', $event)"
      />

      <div v-if="loadError" class="m-state" role="alert">
        <AppIcon name="CircleAlert" :size="24" />
        <p>{{ loadError }}</p>
        <Button size="small" type="primary" @click="$emit('retry')">重新加载</Button>
      </div>

      <div v-else-if="loading" class="m-state" role="status">
        <p>正在加载菜单…</p>
      </div>

      <template v-else-if="dishes.length">
        <article
          v-for="dish in dishes"
          :key="dish.id"
          class="m-dish"
          :class="{ 'is-sold': soldOut(dish) }"
        >
          <div class="m-dish__media">
            <img :src="image(dish.image)" :alt="dish.name" loading="lazy" />
            <span v-if="soldOut(dish)" class="m-dish__mask">已售罄</span>
          </div>
          <div class="m-dish__body">
            <h3>
              <router-link
                :to="detailDestination(dish)"
                class="m-dish__title"
                :aria-label="`查看${dish.name}详情`"
              >
                {{ dish.name }}
              </router-link>
            </h3>
            <p class="m-dish__stall">{{ dish.stall }}</p>
            <p class="m-dish__desc">{{ dish.desc }}</p>
            <div class="m-dish__tags">
              <span v-if="!soldOut(dish) && savingsLabel(dish)" class="dish-offer">{{
                savingsLabel(dish)
              }}</span>
              <StatusTag
                v-if="!soldOut(dish) && dish.status === 'warning'"
                type="warning"
                size="sm"
                :text="statusText(dish.status)"
              />
              <StatusTag
                v-if="dish.cuisine && dish.cuisine !== defaultCuisine"
                type="info"
                size="sm"
                :text="dish.cuisine"
              />
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
              <PriceTag
                :value="dish.price"
                :original="soldOut(dish) ? null : dish.originalPrice"
                size="md"
                variant="stacked"
                :show-discount="false"
              />
              <Stepper
                v-quantity-labels="dish.name"
                v-if="!soldOut(dish)"
                :model-value="qtyOf(dish.id)"
                min="0"
                :max="20"
                :name="dish.name"
                theme="round"
                button-size="36"
                icon-size="14"
                @change="$emit('update-quantity', dish, Number($event))"
              />
            </div>
          </div>
        </article>
      </template>

      <div v-else class="m-state">
        <AppIcon name="Search" :size="24" />
        <p>找不到符合条件的菜品</p>
        <Button v-if="hasFilters" size="small" @click="$emit('reset')">清除筛选</Button>
      </div>
    </div>

    <SubmitBar
      v-if="cart.count"
      class="m-submit-bar"
      :price="cart.totalCents"
      :safe-area-inset-bottom="false"
      button-text="去结算"
      button-color="var(--forest)"
      @submit="checkout"
    >
      <span class="basket-count">已选 {{ cart.count }} 份</span>
    </SubmitBar>
  </component>
</template>
