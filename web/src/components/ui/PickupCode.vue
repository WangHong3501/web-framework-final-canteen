<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  code: { type: String, required: true },
  window: { type: String, default: '' },
  eta: { type: String, default: '' },
  hint: { type: String, default: '凭取餐码到窗口取餐' },
  size: { type: String, default: 'md' },
})
</script>

<template>
  <div class="pickup-code" :class="`pickup-code--${size}`">
    <div class="pickup-code__main">
      <span class="pickup-code__label"><AppIcon name="Ticket" :size="14" />取餐码</span>
      <strong class="pickup-code__value">{{ code }}</strong>
      <span class="pickup-code__hint">{{ hint }}</span>
    </div>
    <div v-if="window || eta" class="pickup-code__meta">
      <div v-if="window">
        <span>取餐窗口</span>
        <strong>{{ window }}</strong>
      </div>
      <div v-if="eta">
        <span>预计可取</span>
        <strong>{{ eta }}</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pickup-code {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--pickup-bg-a) 0%, var(--pickup-bg-b) 100%);
  border: 1px dashed var(--pickup-line);
}

.pickup-code__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pickup-code__label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-12);
  color: var(--muted);
}

.pickup-code__value {
  font-family: var(--font-mono);
  font-size: 34px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--forest);
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.pickup-code__hint {
  font-size: var(--fs-12);
  color: var(--gray-400);
}

.pickup-code__meta {
  display: flex;
  gap: var(--space-6);
  margin-left: auto;
  padding-left: var(--space-5);
  border-left: 1px solid var(--line);
}

.pickup-code__meta div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pickup-code__meta span {
  font-size: var(--fs-12);
  color: var(--muted);
  white-space: nowrap;
}

.pickup-code__meta strong {
  font-size: var(--fs-16);
  color: var(--ink);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
}

.pickup-code--sm {
  padding: var(--space-3) var(--space-4);
}
.pickup-code--sm .pickup-code__value {
  font-size: 24px;
}

@media (max-width: 680px) {
  .pickup-code {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
  .pickup-code__meta {
    width: 100%;
    margin-left: 0;
    padding-left: 0;
    padding-top: var(--space-3);
    border-left: 0;
    border-top: 1px solid var(--line);
    justify-content: space-between;
  }
}
</style>
