<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { catalogApi } from '@/api/catalog'
import { requestMessage } from '@/api/http'
import { useCartStore } from '@/stores/cart'
import { isSoldOut } from '@/shared/useMenu'
import StatusTag from '@/components/ui/StatusTag.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const dish = ref(null)
const loading = ref(true)
const errorMsg = ref('')
const qty = ref(1)

const soldOut = computed(() => (dish.value ? isSoldOut(dish.value) : false))
const SPICE_TEXT = { 0: '不辣', 1: '微辣', 2: '中辣', 3: '特辣' }

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    dish.value = await catalogApi.dish(route.params.id)
  } catch (error) {
    errorMsg.value = requestMessage(error, '菜品加载失败。')
  } finally {
    loading.value = false
  }
}

function addToCart() {
  if (!dish.value || soldOut.value) return
  cart.add(dish.value, qty.value)
  ElMessage.success(`已加入 ${qty.value} 份「${dish.value.name}」`)
}

onMounted(load)
</script>

<template>
  <div class="dish-detail-page">
    <button type="button" class="back-link" @click="$router.back()">
      <AppIcon name="ArrowLeft" :size="17" /> 返回
    </button>

    <div v-if="loading" class="loading-block">正在加载菜品…</div>
    <div v-else-if="errorMsg || !dish" class="error-block" role="alert">
      <AppIcon name="CircleAlert" :size="22" />
      <p>{{ errorMsg || '未找到这道菜' }}</p>
      <el-button @click="load">重试</el-button>
    </div>

    <div v-else class="detail-layout">
      <div class="detail-media">
        <img :src="dish.image" :alt="dish.name" />
        <div v-if="soldOut" class="detail-media__mask">
          <AppIcon name="Ban" :size="28" /> 今日已售罄
        </div>
      </div>

      <div class="detail-info">
        <div class="detail-badges">
          <StatusTag v-if="dish.badges?.includes('招牌')" type="brand" text="招牌" />
          <StatusTag v-if="dish.badges?.includes('新品')" type="new" text="新品" />
          <StatusTag v-if="dish.spice" type="hot" :text="SPICE_TEXT[dish.spice]" />
          <StatusTag v-for="tag in dish.tags" :key="tag.text" :type="tag.type" :text="tag.text" />
        </div>

        <h1>{{ dish.name }}</h1>
        <p class="detail-desc">{{ dish.desc }}</p>

        <div class="detail-stats">
          <span><AppIcon name="Star" :size="15" /> {{ dish.rating }} 分</span>
          <span><AppIcon name="ShoppingBag" :size="15" /> 已售 {{ dish.sales }}</span>
          <span><AppIcon name="Store" :size="15" /> {{ dish.stall }}</span>
        </div>

        <div class="detail-meta">
          <div><span>菜品分类</span><strong>{{ dish.category }}</strong></div>
          <div><span>供应餐次</span><strong>{{ dish.meal === 'lunch' ? '午餐' : dish.meal === 'breakfast' ? '早餐' : dish.meal === 'dinner' ? '晚餐' : '夜宵' }}</strong></div>
          <div><span>辣度</span><strong>{{ SPICE_TEXT[dish.spice] || '不辣' }}</strong></div>
        </div>

        <div class="detail-purchase">
          <PriceTag :value="dish.price" :original="dish.originalPrice" size="lg" />
          <div class="detail-purchase__right">
            <div class="qty-stepper qty-stepper--lg">
              <button class="is-minus" type="button" :disabled="qty <= 1" @click="qty = Math.max(1, qty - 1)">
                <AppIcon name="Minus" :size="16" />
              </button>
              <strong>{{ qty }}</strong>
              <button type="button" :disabled="qty >= 20" @click="qty = Math.min(20, qty + 1)">
                <AppIcon name="Plus" :size="16" />
              </button>
            </div>
            <el-button type="primary" round :disabled="soldOut" @click="addToCart">
              <AppIcon name="ShoppingCart" :size="17" /> {{ soldOut ? '今日售罄' : '加入餐车' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dish-detail-page {
  max-width: 1000px;
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
}
.error-block {
  color: var(--danger-600);
}
.detail-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-7);
  align-items: start;
}
.detail-media {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-2xl);
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
  color: var(--gray-400);
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
.detail-purchase__right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.qty-stepper--lg button {
  width: 36px;
  height: 36px;
}
@media (max-width: 900px) {
  .detail-layout {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }
  .detail-info h1 {
    font-size: var(--fs-24);
  }
}
</style>
