<script>
import './account.css'
import { ElMessage, ElMessageBox } from 'element-plus'
import { mapStores } from 'pinia'
import { useUserStore } from '@/stores/user'
import BrandMark from '@/components/ui/BrandMark.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
export default {
  components: { BrandMark, AppIcon, UserAvatar },
  data() {
    return {
      helpOpen: false,
      links: [
        { path: '/center/overview', label: '食光概览', icon: 'LayoutDashboard' },
        { path: '/center/profile', label: '个人资料', icon: 'UserRound' },
        { path: '/center/preferences', label: '用餐偏好', icon: 'SlidersHorizontal' },
        { path: '/center/security', label: '账号安全', icon: 'ShieldCheck' },
      ],
    }
  },
  computed: {
    ...mapStores(useUserStore),
    user() {
      return this.userStore.user || {}
    },
    roleLabel() {
      return this.userStore.isMerchant ? '档口商家' : '校园同学'
    },
  },
  methods: {
    async logout() {
      try {
        await ElMessageBox.confirm('退出后需要重新登录，确定退出当前账号吗？', '退出登录', {
          confirmButtonText: '退出登录',
          cancelButtonText: '继续使用',
          type: 'info',
        })
      } catch {
        return
      }
      try {
        await this.userStore.logout()
      } catch {
        /* Local credentials are still cleared by the store. */
      }
      ElMessage.success('已退出登录')
      await this.$router.replace('/login')
    },
  },
}
</script>
<template>
  <div class="account-app">
    <a href="#account-content" class="skip-link">跳到页面内容</a>
    <header class="app-header">
      <div class="app-header__inner">
        <router-link to="/center/overview" aria-label="食光校园首页" class="brand-link"
          ><BrandMark compact
        /></router-link>
        <nav class="top-nav" aria-label="主导航">
          <router-link to="/center/overview" class="top-nav__active">我的食光</router-link
          ><button type="button" @click="helpOpen = true">用餐帮助</button>
        </nav>
        <div class="header-identity">
          <span class="canteen-label"><AppIcon name="MapPin" :size="16" />{{ user.canteen }}</span
          ><button type="button" class="header-user" @click="$router.push('/center/profile')">
            <UserAvatar :name="userStore.displayName" :tone="user.avatarTone" :size="34" /><span>{{
              userStore.displayName
            }}</span>
          </button>
        </div>
      </div>
    </header>
    <el-container class="account-shell">
      <el-aside class="account-aside" width="224px"
        ><div class="sidebar-identity">
          <UserAvatar :name="userStore.displayName" :tone="user.avatarTone" :size="54" />
          <h2>{{ userStore.displayName }}</h2>
          <span class="role-label"
            ><AppIcon :name="userStore.isMerchant ? 'Store' : 'GraduationCap'" :size="14" />{{
              roleLabel
            }}</span
          >
          <p>{{ user.studentId || user.account }}</p>
        </div>
        <el-menu :default-active="$route.path" router class="account-menu" aria-label="个人中心导航"
          ><el-menu-item v-for="link in links" :key="link.path" :index="link.path"
            ><AppIcon :name="link.icon" :size="19" /><span>{{ link.label }}</span
            ><AppIcon class="nav-chevron" name="ChevronRight" :size="15" /></el-menu-item
        ></el-menu>
        <div class="sidebar-bottom">
          <div class="sidebar-quote">
            <AppIcon name="Leaf" :size="23" />
            <p>生活再忙，<br />也记得好好吃饭。</p>
            <span>食光，与你同在。</span>
          </div>
          <button type="button" class="logout-button" @click="logout">
            <AppIcon name="LogOut" :size="18" />退出登录
          </button>
        </div>
      </el-aside>
      <el-main id="account-content" class="account-content"><router-view /></el-main>
    </el-container>
    <footer class="app-footer">
      <span>食光校园</span><span>让每一餐都有好食光</span
      ><button type="button" @click="helpOpen = true">使用帮助</button>
    </footer>
    <el-dialog v-model="helpOpen" title="让校园用餐更从容" width="460px"
      ><div class="help-content">
        <p>在“个人资料”管理昵称与常去食堂，在“用餐偏好”记录喜欢的口味与食材。</p>
        <p>进入“账号安全”可以修改密码或退出当前账户。下单后请以订单中的实际取餐信息为准。</p>
        <p>如遇登录或账户问题，请联系学校账户管理员。</p>
      </div>
      <template #footer
        ><el-button type="primary" @click="helpOpen = false">继续我的食光</el-button></template
      ></el-dialog
    >
  </div>
</template>
