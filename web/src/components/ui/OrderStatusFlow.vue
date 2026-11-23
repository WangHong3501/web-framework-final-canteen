<script>
import AppIcon from './AppIcon.vue'
const STEPS = [
  { key: 'pending', label: '待支付', icon: 'Wallet' },
  { key: 'preparing', label: '备餐中', icon: 'ChefHat' },
  { key: 'ready', label: '待取餐', icon: 'ShoppingBag' },
  { key: 'completed', label: '已完成', icon: 'CircleCheck' },
]
export default {
  props: {
    status: { type: String, default: 'preparing' },
    compact: { type: Boolean, default: false },
  },
  components: { AppIcon },
  data: () => ({ STEPS }),
  computed: {
    currentIndex() {
      return STEPS.findIndex((step) => step.key === this.status)
    },
    refunded() {
      return this.status === 'refunded'
    },
  },
}
</script>

<template>
  <div class="status-flow" :class="{ 'is-compact': compact }" role="group" aria-label="订单状态">
    <div v-if="refunded" class="flow-refunded">
      <span class="flow-refunded__icon"><AppIcon name="Undo2" :size="16" /></span>
      <div>
        <strong>已退款</strong>
        <p>退款将于 1–3 个工作日退回原支付账户</p>
      </div>
    </div>

    <ol v-else class="flow-list">
      <li
        v-for="(step, index) in STEPS"
        :key="step.key"
        class="flow-step"
        :class="{
          'is-done': currentIndex > index,
          'is-active': currentIndex === index,
          'is-pending': currentIndex < index,
        }"
      >
        <span class="flow-step__node" :aria-current="currentIndex === index ? 'step' : null">
          <AppIcon :name="currentIndex > index ? 'Check' : step.icon" :size="compact ? 14 : 16" />
        </span>
        <span class="flow-step__label">{{ step.label }}</span>
        <span v-if="index < STEPS.length - 1" class="flow-step__line" aria-hidden="true"></span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.status-flow {
  padding: var(--space-2) 0;
}

.flow-list {
  display: flex;
  align-items: flex-start;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0;
}

.flow-step {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  color: var(--gray-400);
}

.flow-step__node {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--gray-100);
  color: var(--gray-400);
  border: 1px solid var(--gray-200);
  transition:
    background-color var(--dur-base) var(--ease-out),
    color var(--dur-base) var(--ease-out);
}

.flow-step__label {
  font-size: var(--fs-12);
  font-weight: var(--fw-medium);
  white-space: nowrap;
}

.flow-step__line {
  position: absolute;
  top: 15px;
  left: calc(50% + 20px);
  right: calc(-50% + 20px);
  height: 1px;
  background: var(--gray-200);
}

.is-done .flow-step__node {
  background: var(--brand-50);
  color: var(--success-600);
  border-color: var(--success-line);
}

.is-done .flow-step__line {
  background: var(--success-line);
}

.is-active .flow-step__node {
  background: var(--forest);
  color: var(--white);
  border-color: var(--forest);
  box-shadow: 0 0 0 4px rgba(35, 75, 54, 0.08);
}

.is-active .flow-step__label {
  color: var(--forest);
  font-weight: var(--fw-semibold);
}

.is-compact .flow-step__node {
  width: 24px;
  height: 24px;
}

.is-compact .flow-step__line {
  top: 12px;
}

.is-compact .flow-step__label {
  font-size: var(--fs-10);
}

.flow-refunded {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--danger-100);
  border: 1px solid var(--danger-line);
  color: var(--danger-600);
}

.flow-refunded__icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--white);
  color: var(--danger-600);
}

.flow-refunded strong {
  font-size: var(--fs-14);
}

.flow-refunded p {
  margin: 2px 0 0;
  font-size: var(--fs-12);
  color: var(--muted);
}

@media (max-width: 680px) {
  .flow-list {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }
  .flow-step {
    flex-direction: row;
    align-items: center;
    gap: var(--space-3);
  }
  .flow-step__line {
    position: static;
    width: 1px;
    height: 12px;
    margin-left: 15px;
    display: none;
  }
}
</style>
