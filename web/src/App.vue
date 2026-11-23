<script>
import { computed } from 'vue'
import AppNavigation from '@/components/ui/AppNavigation.vue'

export default {
  components: { AppNavigation },
  data: () => ({
    compactLayout: window.matchMedia('(max-width: 767px)').matches,
  }),
  provide() {
    return { compactLayout: computed(() => this.compactLayout) }
  },
  mounted() {
    this.viewportQuery = window.matchMedia('(max-width: 767px)')
    this.viewportQuery.addEventListener('change', this.updateLayout)
  },
  beforeUnmount() {
    this.viewportQuery.removeEventListener('change', this.updateLayout)
  },
  methods: {
    updateLayout(event) {
      this.compactLayout = event.matches
    },
  },
}
</script>

<template>
  <div v-if="$route.meta.requiresAuth" class="workspace">
    <a href="#app-content" class="skip-link" @click.prevent="$refs.content.focus()">跳到页面内容</a>
    <AppNavigation />
    <main id="app-content" ref="content" tabindex="-1">
      <router-view />
    </main>
  </div>
  <router-view v-else />
  <span class="sr-only" aria-live="polite">{{ $route.meta.title }}</span>
</template>

<style scoped>
.workspace {
  --workspace-header-height: 64px;
  min-height: 100vh;
}

@media (max-width: 767px) {
  .workspace {
    --workspace-header-height: 0px;
    --workspace-bottom-nav: calc(60px + env(safe-area-inset-bottom, 0px));
    padding-bottom: var(--workspace-bottom-nav);
  }
}
</style>
