<script setup>
import AppIcon from './AppIcon.vue'

const props = defineProps({
  modelValue: { type: String, default: 'lunch' },
  options: {
    type: Array,
    default: () => [
      { key: 'breakfast', label: '早餐', icon: 'Sun' },
      { key: 'lunch', label: '午餐', icon: 'Soup' },
      { key: 'dinner', label: '晚餐', icon: 'Moon' },
      { key: 'night', label: '夜宵', icon: 'Sparkles' },
    ],
  },
  disabledKeys: { type: Array, default: () => [] },
  size: { type: String, default: 'md' },
})

const emit = defineEmits(['update:modelValue', 'change'])

function select(option) {
  if (props.disabledKeys.includes(option.key) || option.key === props.modelValue) return
  emit('update:modelValue', option.key)
  emit('change', option.key)
}
</script>

<template>
  <div class="meal-switch" :class="`meal-switch--${size}`" role="tablist" aria-label="餐次切换">
    <button
      v-for="option in options"
      :key="option.key"
      type="button"
      role="tab"
      class="meal-switch__item"
      :class="{
        'is-active': option.key === modelValue,
        'is-disabled': disabledKeys.includes(option.key),
      }"
      :aria-selected="option.key === modelValue"
      :aria-disabled="disabledKeys.includes(option.key)"
      :tabindex="option.key === modelValue ? 0 : -1"
      @click="select(option)"
    >
      <AppIcon v-if="option.icon" :name="option.icon" :size="16" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.meal-switch {
  display: inline-flex;
  padding: var(--space-1);
  gap: 2px;
  background: var(--gray-100);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
}

.meal-switch__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  padding: 4px 16px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--muted);
  font-size: var(--fs-13);
  font-weight: var(--fw-medium);
  transition:
    background-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.meal-switch__item:hover:not(.is-active):not(.is-disabled) {
  color: var(--forest);
}

.meal-switch__item.is-active {
  background: var(--surface);
  color: var(--forest);
  font-weight: var(--fw-semibold);
  box-shadow: var(--shadow-2);
}

.meal-switch__item.is-disabled {
  color: var(--gray-300);
  cursor: not-allowed;
}

.meal-switch__item:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}

.meal-switch--sm .meal-switch__item {
  min-height: 28px;
  padding: 2px 12px;
  font-size: var(--fs-12);
}

@media (max-width: 680px) {
  .meal-switch {
    display: flex;
    width: 100%;
  }
  .meal-switch__item {
    flex: 1;
    min-height: 44px;
    padding: 0 8px;
  }
}
</style>
