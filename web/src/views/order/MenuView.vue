<script setup>
import '@/styles/order.css'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { mapStores } from 'pinia'
import { catalogApi } from '@/api/catalog'
import { ordersApi } from '@/api/orders'
import { requestMessage } from '@/api/http'
import { useCartStore } from '@/stores/cart'
import { useMenu, MEALS, isSoldOut } from '@/shared/useMenu'
import MealSwitch from '@/components/ui/MealSwitch.vue'
import FoodCard from '@/components/ui/FoodCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import QuickEntries from '@/components/ui/QuickEntries.vue'

// 说明：本页为桌面 Element Plus 端，重展示与信息密度；
// 移动 Vant 端见 views/mobile/MobileOrderView.vue，二者共享 useMenu / cart / 业务组件。
const router = useRouter()
const cart = useCartStore()
const assetBase = import.meta.env.BASE_URL

const dishes = ref([])
const loading = ref(true)
const loadError = ref('')
const keywordInput = ref('')

const { meal, category, keyword, categories, filtered, resetFilters } = useMenu(dishes)
const soldOut = isSoldOut

// 餐次切换必须同步到购物车：下单载荷与确认时段都取自 cart.meal
watch(meal, (v) => cart.setMeal(v), { immediate: true })

const dishCount = computed(() => dishes.value.length)
const availableCount = computed(() => dishes.value.filter((d) => !soldOut(d)).length)
const cartCount = computed(() => cart.count)
const qtyOf = (id) => cart.items.find((i) => i.dishId === id)?.qty || 0

async function loadMenu() {
  loading.value = true
  loadError.value = ''
  try {
    dishes.value = await catalogApi.dishes()
  } catch (error) {
    loadError.value = requestMessage(error, '菜单加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

function onSearch(value) {
  keyword.value = value || ''
}

function addDish(dish) {
  if (soldOut(dish)) return
  cart.add(dish, 1)
  ElMessage({ message: `已加入「${dish.name}」`, type: 'success', duration: 1400 })
}

function minusDish(dish) {
  cart.decrease(dish.id)
}

function goDish(dish) {
  router.push({ name: 'dish-detail', params: { id: dish.id } })
}

function openDish(dish) {
  goDish(dish)
}

// 金刚区快捷入口：餐次/分类直接设筛选，其余跳转对应页面
const MEAL_KEYS = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner' }
function onQuickEntry(key) {
  if (key === 'order') return resetFilters()
  if (key === 'orders') return router.push('/orders')
  if (key === 'cart') return router.push('/cart')
  if (MEAL_KEYS[key]) {
    resetFilters()
    meal.value = MEAL_KEYS[key]
    return
  }
  if (key === 'veg') {
    resetFilters()
    const vegCat = categories.value.find((c) => c.includes('轻食') || c.includes('素'))
    if (vegCat) category.value = vegCat
  }
  if (key === 'signature') {
    resetFilters()
    keyword.value = '招牌'
  }
}

onMounted(loadMenu)
</script>

<template>
  <div class="menu-page">
    <section class="order-hero order-enter">
      <span class="order-hero__eyebrow">SHIGUANG · CAMPUS CANTEEN</span>
      <h1>好好吃饭，<br />是每天的头条大事。</h1>
      <p>今天想吃点什么？挑一款喜欢的，温热新鲜，到窗口即可取餐。</p>
      <div class="order-hero__meta">
        <div><strong>{{ dishCount }}</strong><span>在售菜品</span></div>
        <div><strong>{{ availableCount }}</strong><span>现在可做</span></div>
        <div><strong>4</strong><span>人气档口</span></div>
      </div>
      <div class="order-hero__visual" aria-hidden="true">
        <img :src="`${assetBase}images/fresh-bowl.jpg`" alt="" />
        <span>今日现做 · 到店即取</span>
      </div>
    </section>

    <!-- 美团式金刚区：快捷入口（与移动端同款） -->
    <div class="menu-quick">
      <QuickEntries :columns="8" @select="onQuickEntry" />
    </div>

    <div class="order-section-head">
      <div>
        <h2>今日菜单</h2>
        <p>按餐次挑选，售罄菜品会标注提示</p>
      </div>
    </div>

    <div class="order-toolbar">
      <MealSwitch v-model="meal" :options="MEALS" />
      <el-input
        :model-value="keywordInput"
        placeholder="搜索菜名或口味…"
        clearable
        class="menu-search"
        @update:model-value="(v) => { keywordInput = v; onSearch(v) }"
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

    <div v-else-if="filtered.length" class="dish-grid">
      <FoodCard
        v-for="dish in filtered"
        :key="dish.id"
        :food="dish"
        class="order-enter"
        @click="openDish(dish)"
      >
        <template #action>
          <div class="dish-action" @click.stop>
            <div v-if="qtyOf(dish.id) > 0" class="qty-stepper">
              <button class="is-minus" type="button" :aria-label="`减少${dish.name}`" @click="minusDish(dish)">
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
      detail="这个分类暂时没有菜品，试试其它餐次或清空搜索关键词。"
      action-label="重置筛选"
      icon="Search"
      @action="resetFilters(); keywordInput = ''"
    />

    <Transition name="cart-bar">
      <div v-if="cartCount > 0" class="cart-bar">
        <span class="cart-bar__basket">
          <AppIcon name="ShoppingCart" :size="22" />
          <span class="cart-bar__badge">{{ cartCount }}</span>
        </span>
        <div class="cart-bar__summary">
          <small>已选 {{ cartCount }} 件 · 合计</small>
          <PriceTag :value="cart.total" size="sm" />
        </div>
        <span class="cart-bar__spacer"></span>
        <el-button type="primary" round @click="$router.push('/cart')">
          去结算 <AppIcon name="ArrowRight" :size="16" />
        </el-button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.menu-page {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: var(--space-8);
}
/* hero 字号收敛：消除过大标题，与移动端同层级 */
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
  margin: var(--space-4) 0 var(--space-2);
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
