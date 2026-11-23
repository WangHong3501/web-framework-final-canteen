<script>
import './account.css'
import { ElMessage, ElMessageBox } from 'element-plus'
import { mapStores } from 'pinia'
import { useUserStore } from '@/stores/user'
import AppIcon from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const accountLinks = [
  { path: '/center/overview', label: '食光概览', icon: 'LayoutDashboard' },
  { path: '/center/profile', label: '个人资料', icon: 'UserRound' },
  { path: '/center/preferences', label: '用餐偏好', icon: 'SlidersHorizontal' },
  { path: '/center/security', label: '账号安全', icon: 'ShieldCheck' },
]

export default {
  components: { AppIcon, UserAvatar },
  data: () => ({ helpOpen: false, accountLinks }),
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
        <el-menu :default-active="$route.path" router class="account-menu" aria-label="账号设置"
          ><el-menu-item v-for="link in accountLinks" :key="link.path" :index="link.path"
            ><AppIcon :name="link.icon" :size="19" /><span>{{ link.label }}</span
            ><AppIcon class="nav-chevron" name="ChevronRight" :size="15" /></el-menu-item
        ></el-menu>
        <div class="account-actions">
          <button type="button" @click="helpOpen = true">
            <AppIcon name="CircleHelp" :size="18" />使用帮助
          </button>
          <button type="button" @click="logout">
            <AppIcon name="LogOut" :size="18" />退出登录
          </button>
        </div>
      </el-aside>
      <div class="account-content"><router-view /></div>
    </el-container>
    <el-dialog v-model="helpOpen" title="使用帮助" width="min(460px, calc(100% - 32px))"
      ><div class="help-content">
        <p>下单后在「订单」查看备餐进度、取餐窗口和取餐码。</p>
        <p>在「账号安全」可以修改密码或退出所有设备。遇到账号问题，请联系学校账户管理员。</p>
      </div>
      <template #footer
        ><el-button type="primary" @click="helpOpen = false">关闭</el-button></template
      ></el-dialog
    >
  </div>
</template>
