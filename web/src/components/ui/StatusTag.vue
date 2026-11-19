<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'info',
    validator: (val) =>
      ['success', 'warning', 'danger', 'info', 'brand', 'new', 'hot', 'sold', 'veg', 'halal'].includes(
        val,
      ),
  },
  text: { type: String, default: '' },
  size: { type: String, default: 'md' },
  dot: { type: Boolean, default: false },
})

const FALLBACK = {
  success: '可点餐',
  warning: '余量少',
  danger: '已售罄',
  info: '已下架',
  brand: '招牌',
  new: '新品',
  hot: '热销',
  sold: '售罄',
  veg: '素食',
  halal: '清真',
}

const label = computed(() => props.text || FALLBACK[props.type] || '')
</script>

<template>
  <span class="status-tag" :class="[`tag-${type}`, `tag--${size}`]">
    <i v-if="dot" class="status-tag__dot" aria-hidden="true"></i>{{ label }}
  </span>
</template>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px 10px;
  border-radius: 6px;
  font-size: var(--fs-12);
  line-height: 1.6;
  font-weight: var(--fw-medium);
  white-space: nowrap;
  border: 1px solid transparent;
}

.tag--sm {
  font-size: var(--fs-10);
  padding: 1px 7px;
}

.tag--lg {
  font-size: var(--fs-13);
  padding: 4px 12px;
}

.status-tag__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.75;
}

.tag-success {
  color: var(--success-600);
  background: var(--success-100);
  border-color: var(--success-line);
}

.tag-warning {
  color: var(--warning-600);
  background: var(--warning-100);
  border-color: var(--warning-line);
}

.tag-danger {
  color: var(--danger-600);
  background: var(--danger-100);
  border-color: var(--danger-line);
}

.tag-info {
  color: var(--info-600);
  background: var(--info-100);
  border-color: var(--info-line);
}

.tag-brand {
  color: var(--sem-brand);
  background: var(--sem-brand-bg);
  border-color: var(--sem-brand-line);
}

.tag-new {
  color: var(--sem-new);
  background: var(--sem-new-bg);
  border-color: var(--sem-new-line);
}

.tag-hot {
  color: var(--sem-spice);
  background: var(--sem-spice-bg);
  border-color: var(--sem-spice-line);
}

.tag-sold {
  color: var(--white);
  background: var(--sem-sold);
  border-color: var(--sem-sold);
}

.tag-veg {
  color: var(--sem-veg);
  background: var(--sem-veg-bg);
  border-color: var(--success-line);
}

.tag-halal {
  color: var(--sem-halal);
  background: var(--sem-halal-bg);
  border-color: var(--sem-halal-line);
}
</style>
