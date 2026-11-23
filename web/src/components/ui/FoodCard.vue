<script>
import StatusTag from './StatusTag.vue'
import PriceTag from './PriceTag.vue'
import AppIcon from './AppIcon.vue'
import { isDishSoldOut } from '@/components/dishes/dish-meta'
const STATUS_TEXT = {
  success: '可点餐',
  warning: '余量少',
  danger: '已售罄',
}
const SPICE_TEXT = {
  1: '微辣',
  2: '中辣',
  3: '特辣',
  mild: '微辣',
  medium: '中辣',
  hot: '特辣',
}
export default {
  props: {
    food: {
      type: Object,
      required: true,
    },
  },
  components: { StatusTag, PriceTag, AppIcon },
  emits: ['add'],
  computed: {
    soldOut() {
      return isDishSoldOut(this.food) || this.food.status === 'sold'
    },
    statusText() {
      return STATUS_TEXT[this.food.status] || ''
    },
    badges() {
      return this.food.badges || []
    },
    spiceText() {
      return SPICE_TEXT[this.food.spice] || ''
    },
    extraTags() {
      return this.food.tags || []
    },
  },
}
</script>

<template>
  <article class="food-card" :class="{ 'is-sold': soldOut }">
    <div class="food-media">
      <img :src="food.image" :alt="food.imageAlt || food.name" loading="lazy" />
      <div class="food-chips">
        <StatusTag v-if="badges.includes('招牌')" type="brand" size="sm" text="招牌" />
        <StatusTag v-if="badges.includes('新品')" type="new" size="sm" text="新品" />
      </div>
      <StatusTag
        v-if="!soldOut && food.status"
        :type="food.status"
        :text="statusText"
        size="sm"
        class="food-status"
      />
      <div v-if="soldOut" class="food-mask">
        <AppIcon name="Ban" :size="18" />
        <span>今日已售罄</span>
      </div>
    </div>

    <div class="food-info">
      <h3 class="food-name">{{ food.name }}</h3>
      <p class="food-desc">{{ food.desc }}</p>

      <div v-if="spiceText || extraTags.length" class="food-meta">
        <StatusTag v-if="spiceText" type="hot" size="sm" :text="spiceText" />
        <StatusTag
          v-for="tag in extraTags"
          :key="tag.text"
          :type="tag.type || 'info'"
          :text="tag.text"
          size="sm"
        />
      </div>

      <div class="food-bottom">
        <PriceTag :value="food.price" size="md" :original="food.originalPrice" />
        <slot name="action">
          <button class="text-button" type="button" :disabled="soldOut" @click="$emit('add', food)">
            {{ soldOut ? '明日再来' : '加入餐车' }}
          </button>
        </slot>
      </div>
    </div>
  </article>
</template>

<style scoped>
.food-card {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  overflow: hidden;
  transition:
    transform var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out);
}

.food-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-3);
  border-color: var(--brand-200);
}

.food-media {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--gray-100);
  overflow: hidden;
}

.food-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--dur-slow) var(--ease-out);
}

.food-card:hover .food-media img {
  transform: scale(1.04);
}

.food-chips {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  display: flex;
  gap: var(--space-1);
}

.food-status {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
}

.food-mask {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: var(--space-2);
  justify-items: center;
  color: var(--white);
  font-size: var(--fs-13);
  font-weight: var(--fw-semibold);
  background: rgba(36, 53, 44, 0.55);
  backdrop-filter: saturate(0.6) blur(1px);
}

.is-sold .food-media img {
  filter: grayscale(0.7) brightness(0.9);
}

.food-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) 14px 14px;
}

.food-name {
  font-size: var(--fs-15);
  color: var(--ink);
  margin: 0;
  font-weight: var(--fw-semibold);
  line-height: var(--lh-title);
}

.food-desc {
  font-size: var(--fs-12);
  color: var(--muted);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.food-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.food-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-1);
}

@media (max-width: 680px) {
  .food-info {
    padding: var(--space-3);
  }
  .food-name {
    font-size: var(--fs-14);
  }
}
</style>
