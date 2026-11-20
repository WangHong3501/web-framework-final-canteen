<script>
import '@/styles/order.css'
import '@/components/dishes/dishes.css'
import { ElMessage } from 'element-plus'
import { mapStores } from 'pinia'
import { dishesApi } from '@/api/dishes'
import { requestMessage } from '@/api/http'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import DishTopBar from '@/components/dishes/DishTopBar.vue'
import DishStallTabs from '@/components/dishes/DishStallTabs.vue'
import MealSwitch from '@/components/ui/MealSwitch.vue'
import FoodCard from '@/components/ui/FoodCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import QuickEntries from '@/components/ui/QuickEntries.vue'
import {
  DISH_CATEGORIES,
  DISH_MEALS,
  filterDishList,
  isDishSoldOut,
  resolveDishImage,
} from '@/components/dishes/dish-meta'

const MEAL_OPTIONS_SET = new Set(DISH_MEALS.map((item) => item.key))
const MEAL_KEYS = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', night: 'night' }

export default {
  components: {
    DishTopBar,
    DishStallTabs,
    MealSwitch,
    FoodCard,
    EmptyState,
    AppIcon,
    PriceTag,
    QuickEntries,
  },
  data() {
    const query = this.$route.query
    return {
      assetBase: import.meta.env.BASE_URL,
      dishes: [],
      stalls: [],
      loading: true,
      loadError: '',
      meal: MEAL_OPTIONS_SET.has(query.meal) ? query.meal : 'all',
      stallId: typeof query.stall === 'string' && query.stall ? query.stall : 'all',
      category:
        typeof query.category === 'string' && DISH_CATEGORIES.includes(query.category)
          ? query.category
          : '全部',
      keyword: typeof query.q === 'string' ? query.q : '',
      mealOptions: DISH_MEALS,
    }
  },
  computed: {
    ...mapStores(useCartStore, useUserStore),
    categories() {
      const scoped = filterDishList(this.dishes, { meal: this.meal, stallId: this.stallId })
      const present = new Set(scoped.map((item) => item.category).filter(Boolean))
      return ['全部', ...DISH_CATEGORIES.filter((cat) => present.has(cat))]
    },
    filteredDishes() {
      return filterDishList(this.dishes, {
        meal: this.meal,
        stallId: this.stallId,
        category: this.category,
        keyword: this.keyword,
      })
    },
    dishCount() {
      return this.dishes.length
    },
    availableCount() {
      return this.dishes.filter((item) => !this.soldOut(item)).length
    },
    stallCount() {
      return this.stalls.length || 4
    },
    cartCount() {
      return this.cartStore.count
    },
    hasActiveFilter() {
      return (
        this.meal !== 'all' ||
        this.stallId !== 'all' ||
        this.category !== '全部' ||
        Boolean(this.keyword.trim())
      )
    },
    filterQuery() {
      const query = {}
      if (this.meal !== 'all') query.meal = this.meal
      if (this.stallId !== 'all') query.stall = this.stallId
      if (this.category !== '全部') query.category = this.category
      if (this.keyword.trim()) query.q = this.keyword.trim()
      return query
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
      if (this.category !== '全部' && !list.includes(this.category)) {
        this.category = '全部'
      }
    },
    filterQuery(nextQuery) {
      const current = {
        ...(MEAL_OPTIONS_SET.has(this.$route.query.meal) ? { meal: this.$route.query.meal } : {}),
        ...(typeof this.$route.query.stall === 'string' && this.$route.query.stall
          ? { stall: this.$route.query.stall }
          : {}),
        ...(typeof this.$route.query.category === 'string' &&
        DISH_CATEGORIES.includes(this.$route.query.category)
          ? { category: this.$route.query.category }
          : {}),
        ...(typeof this.$route.query.q === 'string' && this.$route.query.q.trim()
          ? { q: this.$route.query.q.trim() }
          : {}),
      }
      if (JSON.stringify(current) !== JSON.stringify(nextQuery)) {
        this.$router.replace({ query: nextQuery })
      }
    },
    '$route.query'(query) {
      const nextMeal = MEAL_OPTIONS_SET.has(query.meal) ? query.meal : 'all'
      const nextStall = typeof query.stall === 'string' && query.stall ? query.stall : 'all'
      const nextCategory =
        typeof query.category === 'string' && DISH_CATEGORIES.includes(query.category)
          ? query.category
          : '全部'
      const nextKeyword = typeof query.q === 'string' ? query.q : ''
      if (this.meal !== nextMeal) this.meal = nextMeal
      if (this.stallId !== nextStall) this.stallId = nextStall
      if (this.category !== nextCategory) this.category = nextCategory
      if (this.keyword !== nextKeyword) this.keyword = nextKeyword
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
      if (this.soldOut(dish)) return
      this.cartStore.add(dish, 1)
      ElMessage({ message: `已加入「${dish.name}」`, type: 'success', duration: 1400 })
    },
    minusDish(dish) {
      this.cartStore.decrease(dish.id)
    },
    openDish(dish) {
      this.$router.push({ name: 'dish-detail', params: { id: dish.id } })
    },
    resetFilters() {
      this.meal = 'all'
      this.stallId = 'all'
      this.category = '全部'
      this.keyword = ''
    },
    onQuickEntry(key) {
      if (key === 'order') return this.resetFilters()
      if (key === 'orders') return this.$router.push('/orders')
      if (key === 'cart') return this.$router.push('/cart')
      if (MEAL_KEYS[key]) {
        this.resetFilters()
        this.meal = MEAL_KEYS[key]
        return
      }
      if (key === 'veg') {
        this.resetFilters()
        this.category = '轻食蔬菜'
        return
      }
      if (key === 'signature') {
        this.resetFilters()
        this.keyword = '招牌'
      }
    },
  },
}
</script>

<template>
  <div class="dish-shell">
    <DishTopBar active="menu">
      <template #actions>
        <el-button
          v-if="userStore.isMerchant"
          plain
          size="small"
          @click="$router.push('/admin/dishes')"
        >
          档口菜品管理
        </el-button>
      </template>
    </DishTopBar>

    <main id="dish-main-content" class="dish-main">
      <div class="menu-page">
        <section class="order-hero order-enter">
          <span class="order-hero__eyebrow">SHIGUANG · CAMPUS CANTEEN</span>
          <h1>好好吃饭，<br />是每天的头条大事。</h1>
          <p>今天想吃点什么？按食堂档口与餐次挑一款喜欢的，温热新鲜，到窗口即可取餐。</p>
          <div class="order-hero__meta">
            <div>
              <strong>{{ dishCount }}</strong><span>全部菜品</span>
            </div>
            <div>
              <strong>{{ availableCount }}</strong><span>现在可做</span>
            </div>
            <div>
              <strong>{{ stallCount }}</strong><span>人气档口</span>
            </div>
          </div>
          <div class="order-hero__visual" aria-hidden="true">
            <img :src="`${assetBase}images/fresh-bowl.jpg`" alt="" />
            <span>今日现做 · 到店即取</span>
          </div>
        </section>

        <div class="menu-quick">
          <QuickEntries :columns="8" @select="onQuickEntry" />
        </div>

        <DishStallTabs
          v-model="stallId"
          :stalls="stalls"
          :total-count="dishes.length"
          :filtered-count="filteredDishes.length"
          @reset="resetFilters"
        >
          <template #extra>
            <button v-if="hasActiveFilter" type="button" class="text-button" @click="resetFilters">
              重置全部筛选
            </button>
          </template>
        </DishStallTabs>

        <div class="order-section-head">
          <div>
            <h2>今日菜单</h2>
            <p>按档口、餐次与菜品分类挑选，已售罄菜品会明确标注</p>
          </div>
        </div>

        <div class="order-toolbar">
          <MealSwitch v-model="meal" :options="mealOptions" />
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

        <div class="category-row" role="tablist" aria-label="菜品分类">
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            role="tab"
            class="category-chip"
            :class="{ 'is-active': cat === category }"
            :aria-selected="cat === category"
            @click="category = cat"
          >
            {{ cat }}
          </button>
        </div>

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
            :data-testid="`menu-dish-${dish.id}`"
            class="order-enter"
            @click="openDish(dish)"
          >
            <template #action>
              <div class="dish-action" @click.stop>
                <button
                  type="button"
                  class="dish-detail-link"
                  :aria-label="`查看${dish.name}详情`"
                  @click="openDish(dish)"
                >
                  详情
                </button>
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
                  <button type="button" :aria-label="`增加${dish.name}`" @click="addDish(dish)">
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
          <div v-if="cartCount > 0" class="cart-bar" data-testid="menu-cart-bar">
            <span class="cart-bar__basket">
              <AppIcon name="ShoppingCart" :size="22" />
              <span class="cart-bar__badge">{{ cartCount }}</span>
            </span>
            <div class="cart-bar__summary">
              <small>已选 {{ cartCount }} 件 · 合计</small>
              <PriceTag :value="cartStore.total" size="sm" />
            </div>
            <span class="cart-bar__spacer"></span>
            <el-button type="primary" round @click="$router.push('/cart')">
              去结算 <AppIcon name="ArrowRight" :size="16" />
            </el-button>
          </div>
        </Transition>
      </div>
    </main>

    <footer class="dish-footer">
      <span>食光校园 · 校园菜单</span>
      <span>点餐车实时同步桌面与移动端页面</span>
    </footer>
  </div>
</template>

<style scoped>
.menu-page {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: var(--space-8);
}
.menu-page :deep(.order-hero h1) {
  font-size: var(--fs-30);
}
.menu-page :deep(.order-hero) {
  min-height: 280px;
}
.order-hero__visual {
  position: absolute;
  right: var(--space-9);
  top: 50%;
  width: 232px;
  height: 232px;
  transform: translateY(-50%);
}
.order-hero__visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  border: 6px solid var(--on-brand-3);
  box-shadow: var(--shadow-4);
}
.order-hero__visual span {
  position: absolute;
  left: 50%;
  bottom: calc(-1 * var(--space-2));
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--forest);
  font-size: var(--fs-12);
  font-weight: var(--fw-semibold);
  box-shadow: var(--shadow-2);
}
@media (max-width: 1180px) {
  .order-hero__visual {
    display: none;
  }
}
.menu-quick {
  margin-top: var(--space-5);
}
.menu-search {
  width: 280px;
  max-width: 100%;
}
.category-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-4) 0 var(--space-4);
}
.category-chip {
  padding: 8px 18px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--fs-13);
  font-weight: var(--fw-medium);
  transition: all var(--dur-fast) var(--ease-out);
}
.category-chip:hover {
  color: var(--forest);
  border-color: var(--brand-300);
}
.category-chip.is-active {
  background: var(--forest);
  border-color: var(--forest);
  color: var(--white);
  box-shadow: 0 4px 10px var(--tint-1);
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
.dish-detail-link {
  border: 1px solid var(--line);
  background: var(--gray-50);
  color: var(--forest);
  border-radius: var(--radius-pill);
  padding: 4px 10px;
  font-size: var(--fs-12);
  font-weight: var(--fw-medium);
  white-space: nowrap;
}
.dish-detail-link:hover {
  background: var(--brand-50);
  border-color: var(--brand-300);
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
  .menu-search {
    width: 100%;
  }
  .order-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
