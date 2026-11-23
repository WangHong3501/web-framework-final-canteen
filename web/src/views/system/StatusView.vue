<script>
import './status.css'
import BrandMark from '@/components/ui/BrandMark.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useUserStore } from '@/stores/user'
import { homeDestination, safeDestination } from '@/router/policy'
export default {
  components: { BrandMark, AppIcon },
  computed: {
    user: () => useUserStore(),
    home() {
      return this.user.isAuthenticated ? homeDestination(this.user.user?.role) : '/login'
    },
    content() {
      return {
        forbidden: {
          icon: 'ShieldCheck',
          code: '403',
          title: this.user.isMerchant ? '这个页面仅供学生使用' : '这个页面属于档口商家',
          detail: '当前账户没有访问权限，你仍然可以使用自己的校园账户服务。',
        },
        unavailable: {
          icon: 'RefreshCw',
          code: '稍等一会儿',
          title: '食堂服务暂时未连接',
          detail: '操作尚未完成，请检查网络或稍后再试。我们会为你保留返回的页面。',
        },
        'not-found': {
          icon: 'MapPin',
          code: '404',
          title: '这条小路，走错了',
          detail: '页面可能已移动，或者地址有一点点偏差。回到熟悉的食光吧。',
        },
      }[this.$route.meta.status]
    },
  },
  methods: {
    retry() {
      this.$router.replace(safeDestination(this.$route.query.redirect, this.user.user?.role))
    },
  },
}
</script>
<template>
  <main class="system-page">
    <BrandMark />
    <section class="system-state">
      <span class="system-state__icon"><AppIcon :name="content.icon" :size="56" /></span
      ><span class="system-code">{{ content.code }}</span>
      <h1>{{ content.title }}</h1>
      <p>{{ content.detail }}</p>
      <div class="system-actions">
        <el-button v-if="$route.meta.status === 'unavailable'" type="primary" @click="retry"
          >重新连接<AppIcon name="RefreshCw" :size="17" /></el-button
        ><el-button v-else type="primary" @click="$router.replace(home)">
          {{ home === '/login' ? '前往登录' : user.isMerchant ? '返回订单工作台' : '返回点餐' }}
          <AppIcon name="ArrowRight" :size="17" />
        </el-button>
      </div>
    </section>
    <footer>一顿好饭，总会等你。</footer>
  </main>
</template>
