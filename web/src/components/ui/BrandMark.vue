<script>
export default { props: { compact: Boolean, light: Boolean } }
</script>
<template>
  <span class="brand" :class="{ 'brand--light': light, 'brand--compact': compact }">
    <span class="brand__symbol" aria-hidden="true"
      ><svg viewBox="0 0 48 48" fill="none">
        <path d="M8 24h32c-1 11-6 17-16 17S9 35 8 24Z" fill="currentColor" />
        <path
          d="M16 16c-4-4 5-6 1-10m9 10c-4-4 5-6 1-10m9 10c-4-4 5-6 1-10"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        /></svg
    ></span>
    <span class="brand__wordmark">食光校园<small v-if="!compact">好好吃饭，好好生活</small></span>
  </span>
</template>
