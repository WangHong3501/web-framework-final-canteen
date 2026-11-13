<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import { mapStores } from 'pinia'
import { useUserStore } from '@/stores/user'
import { requestMessage } from '@/api/http'
import { mountScene } from '@/utils/motion'
import AppIcon from '@/components/ui/AppIcon.vue'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import StateNotice from '@/components/ui/StateNotice.vue'
export default {
  components: { AppIcon, SectionPanel, StateNotice },
  data() {
    return {
      loading: true,
      saving: false,
      loadError: '',
      error: '',
      snapshot: '',
      form: { spice: 'mild', cuisines: [], avoidIngredients: [], mealTime: '11:30–12:00' },
      spices: [
        { value: 'none', label: '不吃辣', hint: '清清爽爽' },
        { value: 'mild', label: '微辣', hint: '一点点就好' },
        { value: 'medium', label: '中辣', hint: '恰到好处' },
        { value: 'hot', label: '嗜辣', hint: '无辣不欢' },
      ],
      cuisines: ['家常小炒', '面食米线', '轻食蔬菜', '风味套餐'],
      ingredients: ['香菜', '葱', '姜', '蒜', '花生', '洋葱'],
      times: ['11:00–11:30', '11:30–12:00', '12:00–12:30', '12:30–13:00'],
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
        if (user?.preferences) {
          this.form = JSON.parse(JSON.stringify(user.preferences))
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
    return ElMessageBox.confirm('用餐偏好还未保存，确定离开吗？', '保留修改？', {
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
      this.saving = true
      this.error = ''
      try {
        await this.userStore.savePreferences(JSON.parse(JSON.stringify(this.form)))
        this.snapshot = JSON.stringify(this.form)
        ElMessage.success('用餐偏好已保存')
      } catch (error) {
        this.error = requestMessage(error)
      } finally {
        this.saving = false
      }
    },
    toggleCuisine(value) {
      this.form.cuisines = this.form.cuisines.includes(value)
        ? this.form.cuisines.filter((item) => item !== value)
        : [...this.form.cuisines, value]
    },
  },
}
</script>
<template>
  <div ref="page" class="settings-page">
    <div class="page-heading" data-enter>
      <div>
        <p class="breadcrumb">个人中心 / 用餐偏好</p>
        <h1>你的口味，值得被记住。</h1>
        <p>把小小的偏好留下，让下一餐更合心意。</p>
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
      <SectionPanel title="我的用餐偏好" subtitle="口味没有标准答案，喜欢就是刚刚好"
        ><el-skeleton v-if="loading" :rows="8" animated />
        <form v-else class="preference-form" :aria-busy="saving" @submit.prevent="save">
          <fieldset :disabled="saving">
            <legend>你喜欢多辣？</legend>
            <div class="spice-options">
              <button
                v-for="(spice, index) in spices"
                :key="spice.value"
                type="button"
                :class="{ selected: form.spice === spice.value }"
                :aria-pressed="form.spice === spice.value"
                @click="form.spice = spice.value"
              >
                <span class="spice-dots" aria-hidden="true"
                  ><i v-for="dot in 3" :key="dot" :class="{ filled: index >= dot }"></i></span
                ><strong>{{ spice.label }}</strong
                ><small>{{ spice.hint }}</small>
              </button>
            </div>
          </fieldset>
          <fieldset :disabled="saving">
            <legend>总会让你心动的味道<span>可多选</span></legend>
            <div class="cuisine-options">
              <button
                v-for="(cuisine, index) in cuisines"
                :key="cuisine"
                type="button"
                :class="{ selected: form.cuisines.includes(cuisine) }"
                :aria-pressed="form.cuisines.includes(cuisine)"
                @click="toggleCuisine(cuisine)"
              >
                <AppIcon :name="['Utensils', 'Soup', 'Leaf', 'Store'][index]" :size="22" /><span>{{
                  cuisine
                }}</span
                ><AppIcon v-if="form.cuisines.includes(cuisine)" name="Check" :size="16" />
              </button>
            </div>
          </fieldset>
          <fieldset :disabled="saving">
            <legend>这些食材，可以少一点<span>可多选</span></legend>
            <el-checkbox-group v-model="form.avoidIngredients" aria-label="不喜欢的食材"
              ><el-checkbox
                v-for="ingredient in ingredients"
                :key="ingredient"
                :value="ingredient"
                border
                >{{ ingredient }}</el-checkbox
              ></el-checkbox-group
            >
            <p class="field-note">偏好仅用于记录口味，具体食材请以档口说明为准。</p>
          </fieldset>
          <fieldset :disabled="saving">
            <legend>通常什么时候吃午饭？</legend>
            <el-select v-model="form.mealTime" aria-label="常用取餐时段" class="meal-time-select"
              ><el-option v-for="time in times" :key="time" :label="time" :value="time"
            /></el-select>
            <p class="field-note">只是你常用的时段，不会自动生成预订。</p>
          </fieldset>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <div class="form-actions">
            <el-button type="primary" native-type="submit" :loading="saving" :disabled="!dirty"
              >保存用餐偏好</el-button
            ><span v-if="dirty" class="unsaved-note">有尚未保存的修改</span>
          </div>
        </form></SectionPanel
      >
      <aside class="settings-aside">
        <div class="gentle-note gentle-note--green">
          <AppIcon name="Soup" :size="38" />
          <h2>一人一味，<br />各有各的好食光。</h2>
          <p>今天想吃家常，明天偏爱清爽。你的偏好，随时都可以改变。</p>
          <span class="small-leaf"><AppIcon name="Leaf" :size="18" />好好吃饭，慢慢生活</span>
        </div>
      </aside>
    </div>
  </div>
</template>
