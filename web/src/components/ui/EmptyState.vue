<script>
import AppIcon from './AppIcon.vue'

export default {
  props: {
    title: { type: String, required: true },
    detail: { type: String, default: '' },
    actionLabel: { type: String, default: '' },
    icon: { type: String, default: 'Soup' },
    compact: { type: Boolean, default: false },
  },
  components: { AppIcon },
  emits: ['action'],
}
</script>

<template>
  <div class="empty-state" :class="{ 'empty-state--compact': compact }" role="status">
    <span class="empty-state__art">
      <AppIcon :name="icon" :size="compact ? 24 : 32" />
      <i class="empty-state__leaf" aria-hidden="true"></i>
    </span>
    <h3>{{ title }}</h3>
    <p v-if="detail">{{ detail }}</p>
    <button v-if="actionLabel" type="button" class="empty-state__action" @click="$emit('action')">
      {{ actionLabel }}<AppIcon name="ArrowRight" :size="16" />
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-9) var(--space-5) var(--space-7);
}

.empty-state--compact {
  padding: var(--space-5) var(--space-4);
}

.empty-state__art {
  position: relative;
  width: 84px;
  height: 84px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--brand-50);
  color: var(--brand-400);
  margin-bottom: var(--space-4);
}

.empty-state__leaf {
  position: absolute;
  right: 8px;
  bottom: 10px;
  width: 16px;
  height: 16px;
  border-radius: 50% 0 50% 50%;
  background: var(--leaf);
  transform: rotate(-18deg);
}

.empty-state--compact .empty-state__art {
  width: 56px;
  height: 56px;
  margin-bottom: var(--space-3);
}

.empty-state h3 {
  font-size: var(--fs-16);
  font-weight: var(--fw-medium);
  color: var(--gray-600);
  margin: 0 0 var(--space-2);
}

.empty-state--compact h3 {
  font-size: var(--fs-14);
}

.empty-state p {
  max-width: 420px;
  margin: 0 0 var(--space-4);
  font-size: var(--fs-12);
  line-height: 1.7;
  color: var(--muted);
}

.empty-state--compact p {
  margin-bottom: 0;
}

.empty-state__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  background: var(--white);
  color: var(--forest);
  font-size: var(--fs-13);
  font-weight: var(--fw-medium);
  transition:
    background-color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.empty-state__action:hover {
  background: var(--brand-50);
  border-color: var(--brand-200);
}

.empty-state__action:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 3px;
}
</style>
