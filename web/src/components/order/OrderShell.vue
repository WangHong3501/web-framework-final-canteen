<script>
import DishTopBar from '@/components/dishes/DishTopBar.vue'
import '@/components/dishes/dishes.css'
import '@/styles/order.css'
export default { components: { DishTopBar } }
</script>
<template>
  <div class="dish-shell">
    <DishTopBar active="orders" />
    <main id="dish-main-content" class="dish-main" tabindex="-1"><slot /></main>
  </div>
</template>
