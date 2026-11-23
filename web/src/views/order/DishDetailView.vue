<script>
import { ElMessage } from 'element-plus'
import { mapStores } from 'pinia'
import { dishesApi } from '@/api/dishes'
import { requestMessage } from '@/api/http'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import OrderShell from '@/components/order/OrderShell.vue'
import DishRelatedGrid from '@/components/dishes/DishRelatedGrid.vue'
import StatusTag from '@/components/ui/StatusTag.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  formatYuanFromCents,
  isDishSoldOut,
  isValidDishId,
  mealLabel,
  resolveDishImage,
  spiceLabel,
  toCents,
} from '@/components/dishes/dish-meta'

export default {
  components: {
    OrderShell,
    DishRelatedGrid,
    StatusTag,
    PriceTag,
    EmptyState,
    AppIcon,
  },
  data() {
    return {
      assetBase: import.meta.env.BASE_URL,
      dish: null,
      stalls: [],
      allDishes: [],
      loading: true,
      errorMsg: '',
      qty: 1,
    }
  },
  computed: {
    ...mapStores(useCartStore, useUserStore),
    dishId() {
      return String(this.$route.params.id || '')
    },
    validId() {
      return isValidDishId(this.dishId)
    },
    returnTarget() {
      const { from, ...query } = this.$route.query
      if (from === 'admin-dishes' && this.userStore.isMerchant) return { name: 'admin-dishes' }
      if (from === 'orders') return { name: 'orders' }
      return { name: from === 'mobile' ? 'mobile-order' : 'menu', query }
    },
    returnLabel() {
      return (
        {
          'admin-dishes': '返回菜品管理',
          orders: '返回订单',
        }[this.returnTarget.name] || '返回菜单'
      )
    },
    soldOut() {
      return this.dish ? isDishSoldOut(this.dish) : false
    },
    imageSrc() {
      return this.dish ? resolveDishImage(this.dish.image, this.assetBase) : ''
    },
    stallInfo() {
      if (!this.dish) return null
      return this.stalls.find((item) => String(item.id) === String(this.dish.stallId)) || null
    },
    mealText() {
      return this.dish ? mealLabel(this.dish.meal) : ''
    },
    spiceText() {
      return this.dish ? spiceLabel(this.dish.spice) : '不辣'
    },
    subtotalText() {
      if (!this.dish) return '0.00'
      return formatYuanFromCents(toCents(this.dish.price) * this.qty)
    },
    currentCartQty() {
      return this.cartStore.items.find((item) => item.dishId === this.dishId)?.qty || 0
    },
    relatedDishes() {
      if (!this.dish) return []
      return this.allDishes
        .filter(
          (item) => String(item.stallId) === String(this.dish.stallId) && item.id !== this.dish.id,
        )
        .slice(0, 3)
    },
  },
  watch: {
    '$route.params.id'() {
      this.qty = 1
      this.load()
    },
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      if (!this.validId) {
        this.loading = false
        this.dish = null
        this.errorMsg = '菜品编号格式不正确，请返回校园菜单重新选择。'
        return
      }
      this.loading = true
      this.errorMsg = ''
      this.dish = null
      try {
        const [dish, stalls, allDishes] = await Promise.all([
          dishesApi.get(this.dishId),
          dishesApi.stalls(),
          dishesApi.list(),
        ])
        this.dish = dish
        this.stalls = Array.isArray(stalls) ? stalls : []
        this.allDishes = Array.isArray(allDishes) ? allDishes : []
      } catch (error) {
        this.errorMsg = requestMessage(error, '菜品加载失败，请稍后重试。')
      } finally {
        this.loading = false
      }
    },
    stepQty(delta) {
      const next = this.qty + delta
      if (next < 1) this.qty = 1
      else if (next > 20) this.qty = 20
      else this.qty = next
    },
    addToCart() {
      if (this.userStore.isMerchant || !this.dish || this.soldOut) return
      const added = Math.min(this.qty, 20 - this.currentCartQty)
      if (added <= 0) return
      this.cartStore.add(this.dish, added)
      ElMessage.success(`已加入 ${added} 份「${this.dish.name}」`)
    },
    goRelatedDish(id) {
      this.$router.push({ name: 'dish-detail', params: { id }, query: this.$route.query })
    },
  },
}
</script>

<template>
  <OrderShell>
    <div class="dish-detail-page">
      <div class="detail-topbar">
        <router-link :to="returnTarget" class="back-link">
          <AppIcon name="ArrowLeft" :size="17" /> {{ returnLabel }}
        </router-link>
      </div>

      <div v-if="loading" class="loading-block">
        <el-skeleton :rows="6" animated />
      </div>

      <EmptyState
        v-else-if="errorMsg || !dish"
        :title="errorMsg || '未找到这道菜品'"
        :action-label="validId ? '重新加载' : ''"
        icon="Search"
        @action="load"
      />

      <template v-else>
        <div class="detail-layout">
          <div class="detail-media">
            <img :src="imageSrc" :alt="dish.name" />
            <div v-if="soldOut" class="detail-media__mask">
              <AppIcon name="Ban" :size="28" />
              <span>今日已售罄</span>
            </div>
          </div>

          <div class="detail-info">
            <div class="detail-badges">
              <StatusTag v-if="dish.badges?.includes('招牌')" type="brand" text="招牌" />
              <StatusTag v-if="dish.badges?.includes('新品')" type="new" text="新品" />
              <StatusTag v-if="dish.spice" type="hot" :text="spiceText" />
              <StatusTag
                v-for="tag in dish.tags"
                :key="tag.text"
                :type="tag.type"
                :text="tag.text"
              />
              <StatusTag v-if="soldOut" type="sold" text="已售罄" />
            </div>

            <h1>{{ dish.name }}</h1>
            <p class="detail-desc">{{ dish.desc || '校园食堂每日新鲜现做，到窗口即可取餐。' }}</p>

            <div class="detail-stats">
              <span
                ><AppIcon name="Star" :size="15" />
                {{
                  dish.reviewCount
                    ? `${dish.rating} 分 · ${dish.reviewCount} 条评价`
                    : dish.rating
                      ? `参考评分 ${dish.rating}`
                      : '暂无评分'
                }}</span
              >
              <span><AppIcon name="ShoppingBag" :size="15" /> 已售 {{ dish.sales ?? 0 }}</span>
              <span>
                <AppIcon name="Store" :size="15" />
                {{ dish.stall }}
                <template v-if="stallInfo?.window"> · {{ stallInfo.window }}</template>
              </span>
            </div>

            <div class="detail-meta">
              <div>
                <span>菜系</span><strong>{{ dish.cuisine }}</strong>
              </div>
              <div>
                <span>菜品分类</span><strong>{{ dish.category }}</strong>
              </div>
              <div>
                <span>供应餐次</span><strong>{{ mealText }}</strong>
              </div>
              <div>
                <span>参考辣度</span><strong>{{ spiceText }}</strong>
              </div>
            </div>

            <div v-if="!userStore.isMerchant" class="detail-purchase">
              <div class="detail-price-box">
                <PriceTag :value="dish.price" :original="dish.originalPrice" size="lg" />
                <small class="detail-subtotal" data-testid="detail-subtotal">
                  小计 ¥{{ subtotalText }}
                </small>
              </div>

              <div class="detail-purchase__right">
                <div class="qty-stepper qty-stepper--lg" role="group" aria-label="选择点餐份数">
                  <button
                    class="is-minus"
                    type="button"
                    aria-label="减少份数"
                    :disabled="soldOut || qty <= 1"
                    @click="stepQty(-1)"
                  >
                    <AppIcon name="Minus" :size="16" />
                  </button>
                  <strong data-testid="detail-qty">{{ qty }}</strong>
                  <button
                    type="button"
                    aria-label="增加份数"
                    :disabled="soldOut || qty >= 20"
                    @click="stepQty(1)"
                  >
                    <AppIcon name="Plus" :size="16" />
                  </button>
                </div>
                <el-button
                  type="primary"
                  round
                  :disabled="soldOut || currentCartQty >= 20"
                  data-testid="detail-add-btn"
                  @click="addToCart"
                >
                  <AppIcon name="ShoppingCart" :size="17" />
                  {{ soldOut ? '今日售罄' : '加入餐车' }}
                </el-button>
              </div>
            </div>

            <p
              v-if="!userStore.isMerchant && currentCartQty > 0"
              class="detail-cart-hint"
              data-testid="detail-cart-hint"
            >
              点餐车中已有 {{ currentCartQty }} 份该菜品，
              <router-link to="/cart">去点餐车结算</router-link>
            </p>
          </div>
        </div>

        <DishRelatedGrid :dishes="relatedDishes" :stall-name="dish.stall" @select="goRelatedDish">
          <template #aside>
            <router-link :to="`/menu?stall=${dish.stallId}`" class="text-button">
              查看本档口全部菜品<AppIcon name="ChevronRight" :size="16" />
            </router-link>
          </template>
        </DishRelatedGrid>
      </template>
    </div>
  </OrderShell>
</template>

<style scoped>
.dish-detail-page {
  max-width: 1060px;
  margin: 0 auto;
  padding-bottom: var(--space-8);
}
.detail-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
  margin: var(--space-2) 0 var(--space-5);
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
}
.back-link:hover {
  color: var(--forest);
}
.loading-block {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-2xl);
  padding: var(--space-7);
}
.detail-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-7);
  align-items: start;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
}
.detail-media {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--gray-100);
  box-shadow: var(--shadow-3);
}
.detail-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.detail-media__mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  background: var(--veil-2);
  color: var(--white);
  font-size: var(--fs-16);
  font-weight: var(--fw-semibold);
}
.detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.detail-info h1 {
  font-size: var(--fs-30);
  color: var(--ink);
  margin: 0 0 var(--space-3);
  line-height: 1.2;
}
.detail-desc {
  font-size: var(--fs-14);
  color: var(--muted);
  line-height: 1.7;
  margin: 0 0 var(--space-4);
}
.detail-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--line);
}
.detail-stats span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-13);
  color: var(--muted);
}
.detail-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  padding: var(--space-4) 0;
}
.detail-meta div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-meta span {
  font-size: var(--fs-12);
  color: var(--muted);
}
.detail-meta strong {
  font-size: var(--fs-14);
  color: var(--ink);
  font-weight: var(--fw-medium);
}
.detail-purchase {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}
.detail-price-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-subtotal {
  font-size: var(--fs-12);
  color: var(--muted);
}
.detail-purchase__right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.qty-stepper--lg button {
  width: 36px;
  height: 36px;
}
.detail-cart-hint {
  margin: var(--space-3) 0 0;
  font-size: var(--fs-13);
  color: var(--forest);
}
.detail-cart-hint a {
  font-weight: var(--fw-semibold);
  text-decoration: underline;
  text-underline-offset: 3px;
}
@media (max-width: 900px) {
  .detail-layout {
    grid-template-columns: 1fr;
    gap: var(--space-5);
    padding: var(--space-4);
  }
  .detail-info h1 {
    font-size: var(--fs-24);
  }
}
</style>
