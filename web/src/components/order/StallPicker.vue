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
    <label v-for="group in groups" :key="group.key" :class="{ selected: modelValue === group.key }">
      <input
        type="radio"
        name="checkout-stall"
        :checked="modelValue === group.key"
        @change="$emit('update:modelValue', group.key)"
      />
      <span>{{ group.stall }}</span><strong>¥{{ group.subtotal.toFixed(2) }}</strong>
    </label>
  </fieldset>
</template>

<style scoped>
.stall-picker {
  margin: 0 0 16px;
  padding: 0;
  border: 0;
  min-width: 0;
}
.stall-picker legend {
  font-weight: 650;
}
.stall-picker p {
  margin: 5px 0 10px;
  font-size: 13px;
  color: var(--muted);
}
.stall-picker label {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px;
  margin-top: 5px;
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
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
