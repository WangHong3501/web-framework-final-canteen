<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import { mapStores } from 'pinia'
import { useUserStore } from '@/stores/user'
import { accountApi } from '@/api/account'
import { requestMessage } from '@/api/http'
import { mountScene } from '@/utils/motion'
import AppIcon from '@/components/ui/AppIcon.vue'
import SectionPanel from '@/components/ui/SectionPanel.vue'
export default {
  components: { AppIcon, SectionPanel },
  data() {
    return {
      saving: false,
      loggingOut: false,
      error: '',
      form: { currentPassword: '', newPassword: '', confirmPassword: '' },
    }
  },
  computed: {
    ...mapStores(useUserStore),
    rules() {
      return {
        currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          {
            validator: (_rule, value, callback) => {
              if (
                value.length < 8 ||
                value.length > 72 ||
                !/[A-Za-z]/.test(value) ||
                !/\d/.test(value)
              )
                callback(new Error('使用 8–72 位字母和数字组合'))
              else if (value === this.form.currentPassword)
                callback(new Error('新密码应与当前密码不同'))
              else callback()
            },
            trigger: 'blur',
          },
        ],
        confirmPassword: [
          { required: true, message: '请再次输入新密码', trigger: 'blur' },
          {
            validator: (_rule, value, callback) =>
              value === this.form.newPassword
                ? callback()
                : callback(new Error('两次输入的新密码不一致')),
            trigger: 'blur',
          },
        ],
      }
    },
    loginTime() {
      const value = this.userStore.user?.lastLoginAt
      return value
        ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
        : '暂无记录'
    },
  },
  mounted() {
    this._motion = mountScene(this.$refs.page)
  },
  beforeUnmount() {
    this._motion?.revert()
  },
  methods: {
    async savePassword() {
      if (this.saving) return
      if (!(await this.$refs.passwordForm.validate().catch(() => false))) return
      this.saving = true
      this.error = ''
      try {
        await accountApi.changePassword({
          currentPassword: this.form.currentPassword,
          newPassword: this.form.newPassword,
        })
        this.userStore.clearSession()
        ElMessage.success('密码已更新，请重新登录')
        await this.$router.replace({ name: 'login', query: { reason: 'password-updated' } })
      } catch (error) {
        this.error = requestMessage(error)
      } finally {
        this.saving = false
      }
    },
    async logoutAll() {
      try {
        await ElMessageBox.confirm(
          '所有设备上的登录都会失效，包括当前设备。确定继续吗？',
          '退出所有设备',
          { confirmButtonText: '全部退出', cancelButtonText: '取消' },
        )
      } catch {
        return
      }
      this.loggingOut = true
      try {
        await this.userStore.logout(true)
        ElMessage.success('已退出所有设备')
      } catch {
        ElMessage.warning('本机已退出，暂时无法确认其他设备的状态')
      } finally {
        this.loggingOut = false
        await this.$router.replace('/login')
      }
    },
  },
}
</script>
<template>
  <div ref="page" class="settings-page">
    <div class="page-heading" data-enter>
      <div>
        <p class="breadcrumb">个人中心 / 账号安全</p>
        <h1>安心，才有好食光。</h1>
        <p>管理登录与密码，守护你的校园账户。</p>
      </div>
    </div>
    <div class="settings-grid" data-enter>
      <div class="stacked-panels">
        <SectionPanel title="修改登录密码" subtitle="使用字母与数字组合，让账户更安心"
          ><el-form
            ref="passwordForm"
            :model="form"
            :rules="rules"
            label-position="top"
            :disabled="saving"
            :aria-busy="saving"
            class="password-form"
            @submit.prevent="savePassword"
            ><el-form-item label="当前密码" prop="currentPassword"
              ><el-input
                v-model="form.currentPassword"
                type="password"
                show-password
                autocomplete="current-password"
                maxlength="128"
                placeholder="请输入当前登录密码" /></el-form-item
            ><el-form-item label="新密码" prop="newPassword"
              ><el-input
                v-model="form.newPassword"
                type="password"
                show-password
                autocomplete="new-password"
                maxlength="72"
                placeholder="8–72 位，包含字母和数字" /></el-form-item
            ><el-form-item label="确认新密码" prop="confirmPassword"
              ><el-input
                v-model="form.confirmPassword"
                type="password"
                show-password
                autocomplete="new-password"
                maxlength="72"
                placeholder="请再次输入新密码"
            /></el-form-item>
            <p v-if="error" class="form-error" role="alert">{{ error }}</p>
            <div class="form-actions">
              <el-button type="primary" native-type="submit" :loading="saving">更新密码</el-button>
            </div>
            <p class="field-note">更新成功后，所有设备需要使用新密码重新登录。</p></el-form
          ></SectionPanel
        ><SectionPanel title="登录设备管理" subtitle="在不常用的设备上，记得及时退出"
          ><div class="session-row">
            <span class="session-icon"><AppIcon name="ShieldCheck" :size="24" /></span>
            <div>
              <strong>当前浏览器</strong>
              <p>最近登录：{{ loginTime }}</p>
            </div>
            <span class="session-active">正在使用</span>
          </div>
          <div class="session-action">
            <p>若担心其他设备仍保持登录，可一次退出所有设备。</p>
            <el-button :loading="loggingOut" plain @click="logoutAll">退出所有设备</el-button>
          </div></SectionPanel
        >
      </div>
      <aside class="settings-aside">
        <div class="gentle-note">
          <AppIcon name="ShieldCheck" :size="36" />
          <h2>小习惯，大安心。</h2>
          <p>不要与其他网站共用密码；在公共电脑上使用后，请主动退出账号。</p>
          <div class="security-tips">
            <span><AppIcon name="Check" :size="16" />密码不会展示在个人资料中</span
            ><span><AppIcon name="Check" :size="16" />修改密码后旧会话失效</span
            ><span><AppIcon name="Check" :size="16" />登录失效时自动返回登录页</span>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
