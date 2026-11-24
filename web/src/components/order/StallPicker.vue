<script>
export default {
  props: {
    groups: { type: Array, required: true },
    modelValue: { type: String, required: true },
    disabled: Boolean,
  },
  emits: ['update:modelValue'],
}
</script>

<template>
  <fieldset v-if="groups.length > 1" class="stall-picker" :disabled="disabled">
    <legend>选择本次取餐档口</legend>
    <p>每个档口单独出餐，其余菜品会留在餐车。</p>
    <div class="stall-picker__choices">
      <label
        v-for="group in groups"
        :key="group.key"
        :class="{ selected: modelValue === group.key }"
      >
        <input
          type="radio"
          name="checkout-stall"
          :checked="modelValue === group.key"
          @change="$emit('update:modelValue', group.key)"
        />
        <span
          >{{ group.stall }} <small>{{ group.count }} 份</small></span
        >
        <strong>¥{{ group.subtotal.toFixed(2) }}</strong>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.stall-picker {
  margin: 0 0 var(--space-4);
  padding: 0;
  border: 0;
  min-width: 0;
}
.stall-picker legend {
  font-weight: var(--fw-semibold);
}
.stall-picker p {
  margin: var(--space-1) 0 var(--space-2);
  font-size: var(--fs-13);
  color: var(--muted);
}
.stall-picker__choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: var(--space-2);
}
.stall-picker label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--size-control-mobile);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface);
  cursor: pointer;
}
.stall-picker small {
  color: var(--muted);
}
.stall-picker label.selected {
  background: var(--brand-50);
  border-color: var(--forest);
}
.stall-picker input {
  accent-color: var(--forest);
}
.stall-picker strong {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
</style>
