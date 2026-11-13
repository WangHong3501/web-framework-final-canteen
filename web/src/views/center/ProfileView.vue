<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import { mapStores } from 'pinia'
import { useUserStore } from '@/stores/user'
import { requestMessage } from '@/api/http'
import { mountScene } from '@/utils/motion'
import AppIcon from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import StateNotice from '@/components/ui/StateNotice.vue'
export default {
  components: { AppIcon, UserAvatar, SectionPanel, StateNotice },
  data() {
    return {
      loading: true,
      saving: false,
      loadError: '',
      saveError: '',
      snapshot: '',
      form: { displayName: '', phone: '', email: '', canteen: '第一食堂', avatarTone: 'leaf' },
      tones: ['leaf', 'peach', 'sky', 'oat'],
      rules: {
        displayName: [
          { required: true, whitespace: true, message: '请填写昵称', trigger: 'blur' },
          { max: 20, message: '昵称最多 20 个字符', trigger: 'blur' },
        ],
        phone: [
          {
            pattern: /^$|^1[3-9]\d{9}$/,
            message: '请输入有效的 11 位手机号，或留空',
            trigger: 'blur',
          },
        ],
        email: [
          { type: 'email', message: '请输入有效的邮箱地址，或留空', trigger: 'blur' },
          { max: 100, message: '邮箱最多 100 个字符', trigger: 'blur' },
        ],
      },
    }
  },
  computed: {
    ...mapStores(useUserStore),
    dirty() {
      return !!this.snapshot && JSON.stringify(this.form) !== this.snapshot
    },
  },
  watch: {
    'userStore.user': {
      immediate: true,
      handler(user) {
        if (user) {
          this.form = {
            displayName: user.displayName || user.name,
            phone: user.phone || '',
            email: user.email || '',
            canteen: user.canteen || '第一食堂',
            avatarTone: user.avatarTone || 'leaf',
          }
          this.snapshot = JSON.stringify(this.form)
        }
      },
    },
  },
  mounted() {
    this._motion = mountScene(this.$refs.page)
    this.load()
  },
  beforeUnmount() {
    this._motion?.revert()
  },
  async beforeRouteLeave() {
    if (!this.dirty || !this.userStore.isAuthenticated) return true
    return ElMessageBox.confirm('资料还未保存，确定离开当前页面吗？', '保留修改？', {
      confirmButtonText: '离开页面',
      cancelButtonText: '继续编辑',
    })
      .then(() => true)
      .catch(() => false)
  },
  methods: {
    async load() {
      this.loading = true
      this.loadError = ''
      try {
        await this.userStore.refreshProfile()
      } catch (error) {
        this.loadError = requestMessage(error)
      } finally {
        this.loading = false
      }
    },
    async save() {
      if (this.saving || !this.dirty) return
      if (!(await this.$refs.profileForm.validate().catch(() => false))) return
      this.saving = true
      this.saveError = ''
      try {
        await this.userStore.saveProfile({
          ...this.form,
          displayName: this.form.displayName.trim(),
        })
        this.snapshot = JSON.stringify(this.form)
        ElMessage.success('个人资料已保存')
      } catch (error) {
        this.saveError = requestMessage(error)
      } finally {
        this.saving = false
      }
    },
    reset() {
      this.form = JSON.parse(this.snapshot)
      this.$refs.profileForm?.clearValidate()
      this.saveError = ''
    },
  },
}
</script>
<template>
  <div ref="page" class="settings-page">
    <div class="page-heading" data-enter>
      <div>
        <p class="breadcrumb">个人中心 / 个人资料</p>
        <h1>每一面，都是你。</h1>
        <p>完善校园名片，让每一次相遇都更熟悉。</p>
      </div>
    </div>
    <StateNotice
      v-if="loadError"
      :title="loadError"
      kind="error"
      action-label="重新加载"
      @retry="load"
    />
    <div v-else class="settings-grid" data-enter>
      <SectionPanel title="我的个人资料" subtitle="昵称与联系方式由你管理"
        ><el-skeleton v-if="loading" :rows="7" animated /><el-form
          v-else
          ref="profileForm"
          :model="form"
          :rules="rules"
          label-position="top"
          :disabled="saving"
          :aria-busy="saving"
          @submit.prevent="save"
        >
          <div class="avatar-editor">
            <UserAvatar :name="form.displayName" :tone="form.avatarTone" :size="76" />
            <div>
              <strong>选一个今天的好心情色</strong>
              <p>简单一点，也很有辨识度。</p>
              <div class="avatar-choices">
                <UserAvatar
                  v-for="tone in tones"
                  :key="tone"
                  :name="form.displayName"
                  :tone="tone"
                  :size="32"
                  interactive
                  :selected="form.avatarTone === tone"
                  @select="form.avatarTone = $event"
                />
              </div>
            </div>
          </div>
          <div class="form-grid">
            <el-form-item label="昵称" prop="displayName"
              ><el-input
                v-model="form.displayName"
                placeholder="怎么称呼你？"
                maxlength="20"
                show-word-limit
                autocomplete="nickname" /></el-form-item
            ><el-form-item :label="userStore.isMerchant ? '商家账号' : '学号'"
              ><el-input
                :model-value="userStore.user?.studentId || userStore.user?.account"
                disabled
              /><span class="field-note">身份信息由校园账户统一管理</span></el-form-item
            ><el-form-item label="手机号" prop="phone"
              ><el-input
                v-model="form.phone"
                placeholder="选填，用于联系"
                maxlength="11"
                autocomplete="tel"
                inputmode="tel" /></el-form-item
            ><el-form-item label="邮箱" prop="email"
              ><el-input
                v-model="form.email"
                placeholder="选填，你常用的邮箱"
                maxlength="100"
                autocomplete="email" /></el-form-item
            ><el-form-item label="常去食堂" prop="canteen"
              ><el-select v-model="form.canteen" aria-label="常去食堂"
                ><el-option
                  v-for="canteen in ['第一食堂', '第二食堂', '风味食堂']"
                  :key="canteen"
                  :label="canteen"
                  :value="canteen" /></el-select
            ></el-form-item>
          </div>
          <p v-if="saveError" class="form-error" role="alert">
            <AppIcon name="CircleAlert" :size="17" />{{ saveError }}
          </p>
          <div class="form-actions">
            <el-button type="primary" native-type="submit" :loading="saving" :disabled="!dirty"
              >保存个人资料</el-button
            ><el-button :disabled="!dirty || saving" @click="reset">取消修改</el-button
            ><span v-if="dirty" class="unsaved-note">有尚未保存的修改</span>
          </div>
        </el-form></SectionPanel
      >
      <aside class="settings-aside">
        <div class="gentle-note">
          <span class="gentle-note__icon"><AppIcon name="CircleUserRound" :size="28" /></span>
          <h2>把校园名片补充完整</h2>
          <p>一个熟悉的昵称、一处常去的食堂，让你的食光更有归属感。</p>
          <div class="completion-line">
            <span>资料完整度</span><strong>{{ userStore.profileCompletion }}%</strong>
          </div>
          <div class="completion-track">
            <span :style="{ width: `${userStore.profileCompletion}%` }"></span>
          </div>
        </div>
        <div class="aside-hint">
          <AppIcon name="ShieldCheck" :size="19" />
          <p>学号和登录身份不可在此修改。如有信息错误，请联系校园账户管理员。</p>
        </div>
      </aside>
    </div>
  </div>
</template>
