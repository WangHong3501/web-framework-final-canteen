<script>
import { mapStores } from 'pinia'
import { defineAsyncComponent } from 'vue'
import { dishesApi } from '@/api/dishes'
import { requestMessage } from '@/api/http'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import OrderShell from '@/components/order/OrderShell.vue'
import DishStallTabs from '@/components/dishes/DishStallTabs.vue'
import MenuResults from '@/components/dishes/MenuResults.vue'
import MealSwitch from '@/components/ui/MealSwitch.vue'
import FoodCard from '@/components/ui/FoodCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import {
  DISH_CATEGORIES,
  DISH_CUISINES,
  DISH_MEALS,
  filterDishList,
  hasAvailableOffer,
  isDishSoldOut,
  orderMenuDishes,
  resolveDishImage,
} from '@/components/dishes/dish-meta'

const MEAL_OPTIONS_SET = new Set(DISH_MEALS.map((item) => item.key))
const MobileOrderView = defineAsyncComponent(() => import('@/views/mobile/MobileOrderView.vue'))

function readMenuFilters(query) {
  return {
    meal: MEAL_OPTIONS_SET.has(query.meal) ? query.meal : 'all',
    stallId: typeof query.stall === 'string' && query.stall ? query.stall : 'all',
    category: DISH_CATEGORIES.includes(query.category) ? query.category : '全部',
    cuisine: DISH_CUISINES.includes(query.cuisine) ? query.cuisine : '全部',
    onlyOffers: query.offers === '1',
    keyword: typeof query.q === 'string' ? query.q : '',
  }
}

function menuFilterQuery({ meal, stallId, category, cuisine, onlyOffers, keyword }) {
  const query = {}
  if (meal !== 'all') query.meal = meal
  if (stallId !== 'all') query.stall = stallId
  if (category !== '全部') query.category = category
  if (cuisine !== '全部') query.cuisine = cuisine
  if (onlyOffers) query.offers = '1'
  if (keyword.trim()) query.q = keyword.trim()
  return query
}

export default {
  components: {
    OrderShell,
    MobileOrderView,
    DishStallTabs,
    MenuResults,
    MealSwitch,
    FoodCard,
    EmptyState,
    AppIcon,
    PriceTag,
  },
  inject: ['compactLayout'],
  data() {
    return {
      assetBase: import.meta.env.BASE_URL,
      dishes: [],
      stalls: [],
      loading: true,
      loadError: '',
      ...readMenuFilters(this.$route.query),
      mealOptions: DISH_MEALS,
      cuisines: DISH_CUISINES,
    }
  },
  computed: {
    ...mapStores(useCartStore, useUserStore),
    categories() {
      const scoped = filterDishList(this.dishes, { meal: this.meal, stallId: this.stallId })
      const present = new Set(scoped.map((item) => item.category).filter(Boolean))
      return ['全部', ...DISH_CATEGORIES.filter((cat) => present.has(cat))]
    },
    matchingDishes() {
      return filterDishList(this.dishes, {
        meal: this.meal,
        stallId: this.stallId,
        category: this.category,
        cuisine: this.cuisine,
        keyword: this.keyword,
      })
    },
    offeredDishes() {
      return this.matchingDishes.filter(hasAvailableOffer)
    },
    filteredDishes() {
      return orderMenuDishes(this.onlyOffers ? this.offeredDishes : this.matchingDishes)
    },
    pickupLabel() {
      const canteens = new Set(this.stalls.map((stall) => stall.canteen).filter(Boolean))
      return canteens.size === 1 ? `${[...canteens][0]} · 档口自取` : '档口自取'
    },
    showMobileMenu() {
      return (
        !this.userStore.isMerchant && (this.compactLayout || this.$route.name === 'mobile-order')
      )
    },
    isMenuRoute() {
      return ['menu', 'mobile-order'].includes(this.$route.name)
    },
    cartCount() {
      return this.userStore.isMerchant ? 0 : this.cartStore.count
    },
    hasActiveFilter() {
      return Object.keys(this.filterQuery).length > 0
    },
    filterQuery() {
      return menuFilterQuery(this)
    },
  },
  watch: {
    meal: {
      immediate: true,
      handler(value) {
        if (value !== 'all') this.cartStore.setMeal(value)
      },
    },
    categories(list) {
      if (!this.loading && this.category !== '全部' && !list.includes(this.category)) {
        this.category = '全部'
      }
    },
    filterQuery(nextQuery) {
      if (!this.isMenuRoute) return
      const current = menuFilterQuery(readMenuFilters(this.$route.query))
      if (JSON.stringify(current) !== JSON.stringify(nextQuery)) {
        this.$router.replace({ name: this.$route.name, query: nextQuery })
      }
    },
    '$route.query'(query) {
      if (this.isMenuRoute) Object.assign(this, readMenuFilters(query))
    },
  },
  mounted() {
    this.loadMenu()
  },
  methods: {
    async loadMenu() {
      this.loading = true
      this.loadError = ''
      try {
        const [stalls, dishes] = await Promise.all([dishesApi.stalls(), dishesApi.list()])
        this.stalls = Array.isArray(stalls) ? stalls : []
        this.dishes = Array.isArray(dishes) ? dishes : []
        if (
          this.stallId !== 'all' &&
          !this.stalls.some((item) => String(item.id) === String(this.stallId))
        ) {
          this.stallId = 'all'
        }
      } catch (error) {
        this.loadError = requestMessage(error, '菜单加载失败，请稍后重试。')
      } finally {
        this.loading = false
      }
    },
    soldOut(dish) {
      return isDishSoldOut(dish)
    },
    presentDish(dish) {
      return {
        ...dish,
        soldOut: this.soldOut(dish),
        image: resolveDishImage(dish.image, this.assetBase),
      }
    },
    qtyOf(id) {
      return this.cartStore.items.find((item) => item.dishId === id)?.qty || 0
    },
    addDish(dish) {
      if (this.userStore.isMerchant || this.soldOut(dish) || this.qtyOf(dish.id) >= 20) return
      this.cartStore.add(dish, 1)
    },
    minusDish(dish) {
      this.cartStore.decrease(dish.id)
    },
    setDishQty(dish, qty) {
      if (this.qtyOf(dish.id)) this.cartStore.setQty(dish.id, qty)
      else if (qty > 0) this.cartStore.add(dish, qty)
    },
    dishDestination(dish) {
      return {
        name: 'dish-detail',
        params: { id: dish.id },
        query:
          this.$route.name === 'mobile-order'
            ? { ...this.filterQuery, from: 'mobile' }
            : this.filterQuery,
      }
    },
    resetFilters() {
      this.meal = 'all'
      this.stallId = 'all'
      this.category = '全部'
      this.cuisine = '全部'
      this.onlyOffers = false
      this.keyword = ''
    },
  },
}
</script>

<template>
  <MobileOrderView
    v-if="showMobileMenu"
    v-model:meal="meal"
    v-model:stall-id="stallId"
    v-model:category="category"
    v-model:cuisine="cuisine"
    v-model:keyword="keyword"
    v-model:only-offers="onlyOffers"
    :preview="!compactLayout"
    :dishes="filteredDishes"
    :stalls="stalls"
    :categories="categories"
    :cuisines="cuisines"
    :offer-count="offeredDishes.length"
    :pickup-label="pickupLabel"
    :detail-destination="dishDestination"
    :has-filters="hasActiveFilter"
    :loading="loading"
    :load-error="loadError"
    @update-quantity="setDishQty"
    @retry="loadMenu"
    @reset="resetFilters"
  />
  <OrderShell v-else>
    <div class="menu-page" :class="{ 'menu-page--with-cart': cartCount }">
      <div class="menu-heading">
        <div>
          <h1>{{ userStore.isMerchant ? '学生菜单预览' : '今日菜单' }}</h1>
          <p class="menu-pickup-label"><AppIcon name="MapPin" :size="15" />{{ pickupLabel }}</p>
        </div>
        <el-input
          v-model="keyword"
          placeholder="搜索菜名、档口或描述…"
          aria-label="搜索菜名、档口或描述"
          clearable
          class="menu-search"
        >
          <template #prefix><AppIcon name="Search" :size="16" /></template>
        </el-input>
      </div>

      <section class="menu-filters" aria-label="筛选菜品">
        <DishStallTabs v-model="stallId" :stalls="stalls" />
        <div class="menu-filters__row">
          <MealSwitch v-model="meal" :options="mealOptions" />
          <div class="menu-filters__category">
            <select v-model="cuisine" aria-label="菜系" class="menu-select">
              <option value="全部">全部菜系</option>
              <option v-for="item in cuisines" :key="item" :value="item">{{ item }}</option>
            </select>
            <select v-model="category" aria-label="菜品分类" class="menu-select">
              <option v-for="cat in categories" :key="cat" :value="cat">
                {{ cat === '全部' ? '全部分类' : cat }}
              </option>
            </select>
            <button
              v-if="hasActiveFilter && filteredDishes.length"
              type="button"
              class="text-button"
              @click="resetFilters"
            >
              清除筛选
            </button>
          </div>
        </div>
      </section>

      <MenuResults
        v-if="!loading && !loadError"
        v-model="onlyOffers"
        :count="filteredDishes.length"
        :offers="offeredDishes.length"
      />

      <div v-if="loadError" class="menu-error" role="alert">
        <AppIcon name="CircleAlert" :size="20" />
        <span>{{ loadError }}</span>
        <el-button size="small" @click="loadMenu">重新加载</el-button>
      </div>

      <div v-else-if="loading" class="dish-grid" aria-busy="true">
        <div v-for="n in 8" :key="n" class="dish-skeleton">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="image" style="width: 100%; height: 150px" />
              <div style="padding: 12px">
                <el-skeleton-item variant="text" style="width: 60%" />
                <el-skeleton-item variant="text" style="width: 90%; margin-top: 10px" />
                <el-skeleton-item variant="text" style="width: 40%; margin-top: 14px" />
              </div>
            </template>
          </el-skeleton>
        </div>
      </div>

      <div v-else-if="filteredDishes.length" class="dish-grid" data-testid="menu-dish-grid">
        <FoodCard
          v-for="dish in filteredDishes"
          :key="dish.id"
          :food="presentDish(dish)"
          :detail-to="dishDestination(dish)"
          :data-testid="`menu-dish-${dish.id}`"
        >
          <template #action>
            <div v-if="!userStore.isMerchant" class="dish-action">
              <div v-if="qtyOf(dish.id) > 0" class="qty-stepper">
                <button
                  class="is-minus"
                  type="button"
                  :aria-label="`减少${dish.name}`"
                  @click="minusDish(dish)"
                >
                  <AppIcon name="Minus" :size="14" />
                </button>
                <strong>{{ qtyOf(dish.id) }}</strong>
                <button
                  type="button"
                  :disabled="qtyOf(dish.id) >= 20 || soldOut(dish)"
                  :aria-label="`增加${dish.name}`"
                  @click="addDish(dish)"
                >
                  <AppIcon name="Plus" :size="14" />
                </button>
              </div>
              <button
                v-else
                class="add-btn"
                type="button"
                :disabled="soldOut(dish)"
                :aria-label="`将${dish.name}加入餐车`"
                @click="addDish(dish)"
              >
                <AppIcon :name="soldOut(dish) ? 'Ban' : 'Plus'" :size="16" />
              </button>
            </div>
          </template>
        </FoodCard>
      </div>

      <EmptyState
        v-else
        title="换个条件试试看"
        detail="当前筛选条件暂时没有菜品，试试切换档口、餐次或重置筛选。"
        action-label="重置筛选"
        icon="Search"
        @action="resetFilters"
      />

      <Transition name="cart-bar">
        <div
          v-if="!userStore.isMerchant && cartCount > 0"
          class="cart-bar"
          data-testid="menu-cart-bar"
        >
          <span class="cart-bar__basket">
            <AppIcon name="ShoppingCart" :size="22" />
            <span class="cart-bar__badge">{{ cartCount }}</span>
          </span>
          <div class="cart-bar__summary">
            <small>已选 {{ cartCount }} 件 · {{ cartStore.byStall.length }} 个档口</small>
            <PriceTag :value="cartStore.total" size="sm" />
          </div>
          <span class="cart-bar__spacer"></span>
          <el-button type="primary" round @click="$router.push('/cart')">
            去结算 <AppIcon name="ArrowRight" :size="16" />
          </el-button>
        </div>
      </Transition>
    </div>
  </OrderShell>
</template>

<style scoped>
.menu-page {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: var(--space-8);
}
.menu-page--with-cart {
  padding-bottom: calc(var(--space-9) + var(--size-control));
}
.menu-heading,
.menu-filters__row,
.menu-filters__category {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.menu-heading {
  margin-bottom: var(--space-4);
}
.menu-heading h1 {
  margin: 0;
  font-size: var(--fs-30);
  line-height: var(--lh-title);
}
.menu-filters {
  padding: 0 var(--space-4) var(--space-3);
  margin-bottom: var(--space-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
}
.menu-filters__row,
.menu-filters__category {
  flex-wrap: wrap;
}
.menu-filters .text-button {
  min-height: var(--size-control-sm);
  white-space: nowrap;
}
.menu-search {
  width: min(340px, 100%);
}
.menu-error {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--danger-100);
  border: 1px solid var(--danger-line);
  color: var(--danger-600);
  border-radius: var(--radius-lg);
  font-size: var(--fs-13);
}
.menu-error span {
  flex: 1;
}
.dish-skeleton {
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
}
.dish-action {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.cart-bar-enter-active,
.cart-bar-leave-active {
  transition: all var(--dur-base) var(--ease-out);
}
.cart-bar-enter-from,
.cart-bar-leave-to {
  opacity: 0;
  transform: translateY(24px);
}
@media (max-width: 680px) {
  .menu-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .menu-heading h1 {
    font-size: var(--fs-24);
  }
  .menu-search {
    width: 100%;
  }
  .menu-page :deep(.meal-switch) {
    flex-wrap: wrap;
    border-radius: var(--radius-xl);
  }
  .menu-page :deep(.meal-switch__item) {
    flex: 1 0 auto;
    min-height: 36px;
    padding: 4px 10px;
    white-space: nowrap;
    font-size: var(--fs-12);
  }
  .menu-page :deep(.dish-grid) {
    grid-template-columns: 1fr;
  }
}
</style>
