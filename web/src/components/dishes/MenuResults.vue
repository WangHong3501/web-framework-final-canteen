<script>
import AppIcon from '@/components/ui/AppIcon.vue'

export default {
  components: { AppIcon },
  props: {
    count: { type: Number, required: true },
    offers: { type: Number, required: true },
    modelValue: Boolean,
  },
  emits: ['update:modelValue'],
}
</script>

<template>
  <div class="menu-results">
    <span role="status">{{ count }} 道菜品</span>
    <button
      v-if="offers || modelValue"
      type="button"
      class="menu-results__offers"
      :aria-pressed="modelValue"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <AppIcon name="Ticket" :size="16" />仅看优惠<span aria-hidden="true">{{ offers }}</span>
    </button>
  </div>
</template>

<style scoped>
.menu-results {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--size-control);
  margin-bottom: var(--space-2);
  color: var(--muted);
  font-size: var(--fs-13);
}
.menu-results__offers {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--size-control-sm);
  padding: 0 var(--space-3);
  border: 1px solid var(--warning-line);
  border-radius: var(--radius-pill);
  background: var(--warning-100);
  color: var(--warning-600);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
}
.menu-results__offers span {
  font-variant-numeric: tabular-nums;
}
.menu-results__offers:hover,
.menu-results__offers[aria-pressed='true'] {
  background: var(--warning-600);
  color: var(--white);
  border-color: var(--warning-600);
}
</style>
