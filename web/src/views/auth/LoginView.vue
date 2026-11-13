<script>
import './login.css'
import { ElMessage } from 'element-plus'
import { mapStores } from 'pinia'
import { useUserStore } from '@/stores/user'
import { requestMessage } from '@/api/http'
import { safeDestination } from '@/router/policy'
import { mountScene } from '@/utils/motion'
import BrandMark from '@/components/ui/BrandMark.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

export default {
  components: { BrandMark, AppIcon },
  data() {
    return {
      assetBase: import.meta.env.BASE_URL,
      form: { account: '', password: '', role: 'student', remember: false },
      busy: false,
      error: '',
      helpOpen: false,
    }
  },
  computed: {
    ...mapStores(useUserStore),
    accountLabel() {
      return this.form.role === 'student' ? '学号' : '商家账号'
    },
    rules() {
      return {
        account: [
          { required: true, message: `请输入${this.accountLabel}`, trigger: 'blur' },
          { max: 40, message: '账号长度不能超过 40 个字符', trigger: 'blur' },
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { max: 128, message: '密码长度不能超过 128 位', trigger: 'blur' },
        ],
      }
    },
    notice() {
      return this.$route.query.reason === 'expired'
        ? '登录已过期，请重新登录后继续。'
        : this.$route.query.reason === 'password-updated'
          ? '密码已更新，请使用新密码登录。'
          : ''
    },
  },
  watch: {
    'form.role'() {
      this.error = ''
      this.$refs.loginForm?.clearValidate()
    },
  },
  mounted() {
    this._motion = mountScene(this.$refs.page, { login: true })
  },
  beforeUnmount() {
    this._motion?.revert()
  },
  methods: {
    async submit() {
      if (this.busy) return
      const valid = await this.$refs.loginForm.validate().catch(() => false)
      if (!valid) return
      this.busy = true
      this.error = ''
      try {
        await this.userStore.login({ ...this.form, account: this.form.account.trim() })
        ElMessage.success('欢迎回来，今天也要好好吃饭。')
        await this.$router.replace(safeDestination(this.$route.query.redirect))
      } catch (error) {
        this.error = requestMessage(error, '登录未完成，请核对账号后重试。')
      } finally {
        this.busy = false
      }
    },
    async demo(role) {
      if (this.busy) return
      this.form.role = role
      this.form.account = role === 'student' ? '32605150621' : 'merchant01'
      this.form.password = 'Shiguang@2026'
      await this.$nextTick()
      return this.submit()
    },
  },
}
</script>
<template>
  <main ref="page" class="login-page">
    <header class="login-header">
      <BrandMark /><button type="button" class="text-button help-trigger" @click="helpOpen = true">
        <AppIcon name="CircleHelp" :size="18" />登录帮助
      </button>
    </header>
    <div class="login-body">
      <section class="login-form-panel">
        <div class="login-intro" data-enter>
          <span class="welcome-dot">一日三餐，皆是小确幸</span>
          <h1>欢迎回来，<br />今天也要<span class="handdrawn-word">好好吃饭</span>。</h1>
          <p>把排队的时间，留给你喜欢的生活。</p>
        </div>
        <div class="role-switch" role="group" aria-label="登录身份" data-enter>
          <button
            type="button"
            :class="{ active: form.role === 'student' }"
            :aria-pressed="form.role === 'student'"
            :disabled="busy"
            @click="form.role = 'student'"
          >
            <AppIcon name="GraduationCap" />我是学生
          </button>
          <button
            type="button"
            :class="{ active: form.role === 'merchant' }"
            :aria-pressed="form.role === 'merchant'"
            :disabled="busy"
            @click="form.role = 'merchant'"
          >
            <AppIcon name="Store" />档口商家
          </button>
        </div>
        <el-form
          ref="loginForm"
          :model="form"
          :rules="rules"
          label-position="top"
          class="login-form"
          :aria-busy="busy"
          @submit.prevent="submit"
          data-enter
        >
          <p v-if="notice" class="inline-notice" role="status">{{ notice }}</p>
          <el-form-item :label="accountLabel" prop="account"
            ><el-input
              v-model="form.account"
              :placeholder="form.role === 'student' ? '请输入你的学号' : '请输入商家账号'"
              autocomplete="username"
              :disabled="busy"
              maxlength="40"
              ><template #prefix
                ><AppIcon
                  :name="form.role === 'student' ? 'UserRound' : 'Store'"
                  :size="19" /></template></el-input
          ></el-form-item>
          <el-form-item label="密码" prop="password"
            ><el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="请输入登录密码"
              autocomplete="current-password"
              :disabled="busy"
              maxlength="128"
              ><template #prefix><AppIcon name="LockKeyhole" :size="19" /></template></el-input
          ></el-form-item>
          <div class="login-options">
            <el-checkbox v-model="form.remember" :disabled="busy">在此设备上保持登录</el-checkbox
            ><button type="button" class="text-button" @click="helpOpen = true">忘记密码？</button>
          </div>
          <p v-if="error" class="form-error" role="alert">
            <AppIcon name="CircleAlert" :size="17" />{{ error }}
          </p>
          <el-button type="primary" native-type="submit" class="login-submit" :loading="busy"
            >{{ busy ? '正在登录' : '登录食光校园'
            }}<AppIcon v-if="!busy" name="ArrowRight" :size="20"
          /></el-button>
        </el-form>
        <div class="demo-entry" data-enter>
          <span>初次见面？先体验一餐好食光</span>
          <div>
            <button
              type="button"
              :disabled="busy"
              data-testid="demo-student"
              @click="demo('student')"
            >
              学生账号体验<AppIcon name="ArrowUpRight" :size="16" /></button
            ><button
              type="button"
              :disabled="busy"
              data-testid="demo-merchant"
              @click="demo('merchant')"
            >
              商家账号体验<AppIcon name="ArrowUpRight" :size="16" />
            </button>
          </div>
        </div>
      </section>
      <aside class="login-visual" data-hero aria-label="新鲜食材与校园用餐">
        <div class="visual-topline">
          <span class="visual-pill"><AppIcon name="Leaf" :size="16" />把新鲜，端上餐桌</span
          ><span class="visual-note">每一餐都值得认真对待</span>
        </div>
        <img
          :src="`${assetBase}images/fresh-bowl.jpg`"
          alt="一碗由新鲜蔬菜与谷物搭配的缤纷餐食"
          class="login-food-image"
          fetchpriority="high"
        />
        <div class="visual-copy">
          <p>下课，不必赶饭。</p>
          <h2>好食光，<br />就在校园里。</h2>
          <span>食堂的烟火气，和你的好心情，一起打包。</span>
        </div>
        <div class="pickup-note">
          <span class="pickup-note__icon"><AppIcon name="ShoppingBag" :size="23" /></span>
          <div><strong>提前选好，到店自取</strong><span>少一点等待，多一点从容</span></div>
          <span class="pickup-check"><AppIcon name="Check" :size="18" /></span>
        </div>
      </aside>
    </div>
    <footer class="login-footer">
      <span>食光校园 · 校园餐饮服务</span><span>认真对待每一顿饭，也认真对待你的每一天。</span>
    </footer>
    <el-dialog v-model="helpOpen" title="登录帮助" width="440px"
      ><div class="help-content">
        <p>学生请选择“我是学生”，使用学号登录；档口工作人员请选择“档口商家”。</p>
        <p>
          忘记校园账户密码时，请联系学校账户管理员。若只是想体验食光校园，可使用登录页下方的演示入口。
        </p>
        <div class="demo-credential">
          <strong>课程演示账号</strong><span>学生：32605150621</span><span>商家：merchant01</span
          ><span>演示密码：Shiguang@2026</span>
        </div>
      </div>
      <template #footer
        ><el-button type="primary" @click="helpOpen = false">我知道了</el-button></template
      ></el-dialog
    >
  </main>
</template>
