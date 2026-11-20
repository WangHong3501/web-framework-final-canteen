<script>
import PriceTag from '@/components/ui/PriceTag.vue'
import StatusTag from '@/components/ui/StatusTag.vue'
import { isDishSoldOut, resolveDishImage, statusLabel } from './dish-meta'

export default {
  components: { PriceTag, StatusTag },
  props: {
    dishes: { type: Array, default: () => [] },
    stallName: { type: String, default: '' },
  },
  emits: ['select'],
  data() {
    return {
      assetBase: import.meta.env.BASE_URL,
    }
  },
  methods: {
    imageOf(dish) {
      return resolveDishImage(dish.image, this.assetBase)
    },
    soldOut(dish) {
      return isDishSoldOut(dish)
    },
    statusText(status) {
      return statusLabel(status)
    },
  },
}
</script>

<template>
  <section v-if="dishes.length" class="dish-related-panel" aria-label="同档口其他餐品">
    <header class="dish-related-panel__head">
      <div>
        <h2>同档口其他餐品</h2>
        <p>{{ stallName ? `${stallName}还有这些人气选择` : '同档口可一起加入点餐车' }}</p>
      </div>
      <slot name="aside" />
    </header>

    <div class="dish-related-grid">
      <button
        v-for="item in dishes"
        :key="item.id"
        type="button"
        class="dish-related-card"
        @click="$emit('select', item.id)"
      >
        <img :src="imageOf(item)" :alt="item.name" />
        <div class="dish-related-card__body">
          <strong>{{ item.name }}</strong>
          <div class="dish-related-card__meta">
            <PriceTag :value="item.price" size="sm" />
            <StatusTag
              :type="soldOut(item) ? 'sold' : item.status || 'success'"
              :text="soldOut(item) ? '已售罄' : statusText(item.status)"
              size="sm"
            />
          </div>
        </div>
      </button>
    </div>
  </section>
</template>
