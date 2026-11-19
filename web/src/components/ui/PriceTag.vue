<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: [Number, String], required: true },
  original: { type: [Number, String], default: null },
  variant: { type: String, default: 'default' },
  size: { type: String, default: 'md' },
})

const amount = computed(() => {
  const num = Number(props.value)
  return Number.isFinite(num) ? num : 0
})

const parts = computed(() => {
  const text = amount.value.toFixed(2)
  const [int, dec] = text.split('.')
  return { int, dec }
})

const originalText = computed(() => {
  if (props.original === null || props.original === undefined || props.original === '') return ''
  const num = Number(props.original)
  return Number.isFinite(num) ? num.toFixed(2) : ''
})

const discountBadge = computed(() => {
  if (!originalText.value) return ''
  const base = Number(originalText.value)
  if (!base) return ''
  const rate = Math.round((amount.value / base) * 10)
  return rate < 10 ? `${rate}折` : ''
})
</script>

<template>
  <span class="price-tag" :class="[`price--${variant}`, `price--${size}`]">
    <span class="price-tag__sym" aria-hidden="true">¥</span>
    <span class="price-tag__int">{{ parts.int }}</span>
    <span class="price-tag__dec">.{{ parts.dec }}</span>
    <s v-if="originalText" class="price-tag__original">¥{{ originalText }}</s>
    <span v-if="discountBadge" class="price-tag__badge">{{ discountBadge }}</span>
  </span>
</template>

<style scoped>
.price-tag {
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  color: var(--danger-600);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.price-tag__sym {
  font-size: var(--fs-12);
  font-weight: var(--fw-semibold);
  margin-right: 1px;
}

.price-tag__int {
  font-size: var(--fs-20);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.2px;
}

.price-tag__dec {
  font-size: var(--fs-12);
  font-weight: var(--fw-semibold);
}

.price-tag__original {
  margin-left: var(--space-2);
  font-size: var(--fs-12);
  color: var(--gray-400);
  text-decoration: line-through;
}

.price-tag__badge {
  margin-left: var(--space-2);
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  font-size: var(--fs-10);
  font-weight: var(--fw-semibold);
  color: var(--danger-600);
  background: var(--danger-100);
  border: 1px solid var(--danger-line);
  align-self: center;
  white-space: nowrap;
}

.price--sm .price-tag__int {
  font-size: var(--fs-16);
}
.price--sm .price-tag__sym,
.price--sm .price-tag__dec {
  font-size: var(--fs-10);
}

.price--lg .price-tag__int {
  font-size: var(--fs-30);
}
.price--lg .price-tag__sym {
  font-size: var(--fs-14);
}
.price--lg .price-tag__dec {
  font-size: var(--fs-14);
}

.price--muted {
  color: var(--muted);
}
.price--muted .price-tag__int {
  font-size: var(--fs-14);
  font-weight: var(--fw-medium);
}
.price--muted .price-tag__sym,
.price--muted .price-tag__dec {
  font-size: var(--fs-12);
}
</style>
