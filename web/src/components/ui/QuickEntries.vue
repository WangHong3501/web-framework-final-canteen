<script setup>
/**
 * 食堂"金刚区"快捷入口 —— 美团式首页图标网格。
 * 双端共用的纯展示组件：同一套视觉语言、同一批业务语义，
 * 仅通过 columns 适配布局密度；点击事件交给页面决定跳转/切换。
 */
import AppIcon from './AppIcon.vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [
      { key: 'order', label: '立即点餐', icon: 'Utensils', tone: 'brand' },
      { key: 'orders', label: '我的订单', icon: 'ReceiptText', tone: 'info' },
      { key: 'breakfast', label: '早餐', icon: 'Sun', tone: 'warning' },
      { key: 'lunch', label: '午餐', icon: 'Soup', tone: 'brand' },
      { key: 'dinner', label: '晚餐', icon: 'Moon', tone: 'spice' },
      { key: 'veg', label: '轻食素食', icon: 'Leaf', tone: 'success' },
      { key: 'signature', label: '招牌推荐', icon: 'BadgeCheck', tone: 'danger' },
      { key: 'cart', label: '我的餐车', icon: 'ShoppingCart', tone: 'neutral' },
    ],
  },
  columns: { type: Number, default: 4 },
  activeKey: { type: String, default: '' },
  title: { type: String, default: '快捷入口' },
})

const emit = defineEmits(['select'])
</script>

<template>
  <section class="quick-entries" :style="{ '--qe-cols': columns }" aria-label="快捷入口">
    <div class="quick-entries__head">
      <span class="quick-entries__title">{{ title }}</span>
      <span class="quick-entries__hint">点一下，马上到</span>
    </div>
    <div class="quick-entries__grid">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="qe-item"
        :class="[`qe-item--${item.tone}`, { 'is-active': item.key === activeKey }]"
        @click="emit('select', item.key, item)"
      >
        <span class="qe-item__icon"><AppIcon :name="item.icon" :size="22" /></span>
        <span class="qe-item__label">{{ item.label }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.quick-entries {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-1);
  padding: var(--space-4) var(--space-3);
}
.quick-entries__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 var(--space-2);
  margin-bottom: var(--space-3);
}
.quick-entries__title {
  font-size: var(--fs-14);
  font-weight: var(--fw-semibold);
  color: var(--ink);
}
.quick-entries__hint {
  font-size: var(--fs-12);
  color: var(--gray-400);
}
.quick-entries__grid {
  display: grid;
  grid-template-columns: repeat(var(--qe-cols), minmax(0, 1fr));
  gap: var(--space-3) var(--space-1);
}

.qe-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 2px;
  border: 0;
  background: transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}
.qe-item:hover {
  background: var(--gray-50);
}
.qe-item:active .qe-item__icon {
  transform: scale(0.92);
}
.qe-item__icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg);
  transition: transform var(--dur-fast) var(--ease-out);
}
.qe-item__label {
  font-size: var(--fs-12);
  color: var(--gray-600);
  font-weight: var(--fw-medium);
  white-space: nowrap;
}
.qe-item.is-active .qe-item__label {
  color: var(--forest);
  font-weight: var(--fw-semibold);
}
.qe-item.is-active .qe-item__icon {
  box-shadow: 0 0 0 2px var(--forest);
}

/* 语义色调：全部来自令牌，双端一致 */
.qe-item--brand .qe-item__icon { background: var(--sem-brand-bg); color: var(--brand-700); }
.qe-item--info .qe-item__icon { background: var(--info-100); color: var(--info-600); }
.qe-item--warning .qe-item__icon { background: var(--warning-100); color: var(--warning-600); }
.qe-item--spice .qe-item__icon { background: var(--sem-spice-bg); color: var(--sem-spice); }
.qe-item--success .qe-item__icon { background: var(--success-100); color: var(--success-600); }
.qe-item--danger .qe-item__icon { background: var(--danger-100); color: var(--danger-600); }
.qe-item--neutral .qe-item__icon { background: var(--gray-100); color: var(--gray-600); }

@media (max-width: 380px) {
  .qe-item__icon { width: 44px; height: 44px; }
  .qe-item__label { font-size: var(--fs-11); }
}
</style>
