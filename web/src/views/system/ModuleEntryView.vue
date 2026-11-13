<script>
import BrandMark from '@/components/ui/BrandMark.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
export default {
  components: { BrandMark, AppIcon },
  computed: {
    content() {
      return {
        menu: {
          icon: 'Utensils',
          title: '校园菜单，正在准备中',
          detail: '我们期待为你端上更多校园好味道。现在可以先完善个人资料和用餐偏好。',
        },
        orders: {
          icon: 'ShoppingBag',
          title: '订单服务，稍后开放',
          detail: '正式开放后，你可以在这里查看点餐与取餐记录。目前不会生成订单或扣款。',
        },
        admin: {
          icon: 'Store',
          title: '欢迎来到档口工作台',
          detail: '菜品管理服务尚未开放。你可以先管理商家账户资料，确认登录与访问权限正常。',
        },
      }[this.$route.meta.module]
    },
  },
}
</script>
<template>
  <main class="system-page">
    <router-link to="/center/overview" class="brand-link"><BrandMark /></router-link>
    <section class="system-state">
      <span class="system-state__icon"><AppIcon :name="content.icon" :size="56" /></span>
      <h1>{{ content.title }}</h1>
      <p>{{ content.detail }}</p>
      <div class="system-actions">
        <el-button type="primary" @click="$router.push('/center/overview')"
          >回到个人中心<AppIcon name="ArrowRight" :size="17" /></el-button
        ><el-button plain @click="$router.push('/center/profile')">完善资料</el-button>
      </div>
    </section>
    <footer>把每一餐的小事，认真准备好。</footer>
  </main>
</template>
