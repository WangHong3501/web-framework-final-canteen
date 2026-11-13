<script>
import AppIcon from './AppIcon.vue'
export default {
  components: { AppIcon },
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    actionLabel: { type: String, default: '' },
  },
  emits: ['action'],
}
</script>
<template>
  <section class="section-panel">
    <header class="section-panel__header">
      <div>
        <h2>{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <slot name="aside"
        ><button v-if="actionLabel" class="text-button" type="button" @click="$emit('action')">
          {{ actionLabel }}<AppIcon name="ChevronRight" :size="16" /></button
      ></slot>
    </header>
    <slot />
  </section>
</template>
