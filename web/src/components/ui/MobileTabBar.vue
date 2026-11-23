<script>
import AppIcon from './AppIcon.vue'
const tabs = [
  { key: 'order', label: '点餐', icon: 'Utensils' },
  { key: 'cart', label: '餐车', icon: 'ShoppingCart' },
  { key: 'orders', label: '订单', icon: 'ReceiptText' },
  { key: 'mine', label: '我的', icon: 'UserRound' },
]
export default {
  props: {
    active: { type: String, default: 'order' },
    cartCount: { type: Number, default: 0 },
  },
  components: { AppIcon },
  emits: ['navigate'],
  data: () => ({ tabs }),
}
</script>

<template>
  <nav class="mobile-tabbar" aria-label="底部主导航">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="mobile-tabbar__item"
      :class="{ 'is-active': tab.key === active }"
      :aria-current="tab.key === active ? 'page' : undefined"
      @click="$emit('navigate', tab.key)"
    >
      <span class="mobile-tabbar__icon">
        <AppIcon :name="tab.icon" :size="22" />
        <span v-if="tab.key === 'cart' && cartCount > 0" class="mobile-tabbar__badge">
          {{ cartCount > 99 ? '99+' : cartCount }}
        </span>
      </span>
      <span class="mobile-tabbar__label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.mobile-tabbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: calc(62px + env(safe-area-inset-bottom, 0px));
  padding-bottom: calc(4px + env(safe-area-inset-bottom, 0px));
  background: var(--surface);
  border-top: 1px solid var(--line);
  box-shadow: 0 -2px 12px var(--tint-2);
}
.mobile-tabbar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 0;
  background: transparent;
  color: var(--gray-400);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out);
}
.mobile-tabbar__item.is-active {
  color: var(--forest);
}
.mobile-tabbar__icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
}
.mobile-tabbar__badge {
  position: absolute;
  top: -5px;
  right: -9px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--radius-pill);
  background: var(--danger-600);
  color: var(--white);
  font-size: var(--fs-10);
  font-weight: var(--fw-semibold);
  display: grid;
  place-items: center;
  border: 2px solid var(--surface);
}
.mobile-tabbar__label {
  font-size: var(--fs-11);
  font-weight: var(--fw-medium);
}
.mobile-tabbar__item.is-active .mobile-tabbar__label {
  font-weight: var(--fw-semibold);
}
</style>
