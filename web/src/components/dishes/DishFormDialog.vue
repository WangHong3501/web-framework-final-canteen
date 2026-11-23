<script>
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  DISH_BADGE_OPTIONS,
  DISH_CATEGORIES,
  DISH_IMAGE_OPTIONS,
  DISH_MEALS,
  DISH_SPICE_OPTIONS,
  DISH_STATUS_OPTIONS,
  buildDishPayload,
  resolveDishImage,
} from './dish-meta'

function createBlankForm() {
  return {
    name: '',
    price: '',
    originalPrice: '',
    category: DISH_CATEGORIES[0],
    meal: 'lunch',
    status: 'success',
    spice: 0,
    image: DISH_IMAGE_OPTIONS[0].value,
    badges: [],
    desc: '',
  }
}

export default {
  components: { AppIcon },
  props: {
    modelValue: { type: Boolean, default: false },
    editing: { type: Boolean, default: false },
    initialDish: { type: Object, default: null },
    saving: { type: Boolean, default: false },
    errorMessage: { type: String, default: '' },
  },
  emits: ['update:modelValue', 'submit'],
  data() {
    const validatePrice = (_rule, value, callback) => {
      const text = String(value ?? '').trim()
      if (!text) return callback(new Error('请填写菜品价格'))
      const num = Number(text)
      const cents = Math.round(num * 100)
      if (!Number.isFinite(num) || cents < 1 || cents > 99900)
        return callback(new Error('价格需在 0.01 至 999.00 元之间'))
      return callback()
    }
    const validateOriginalPrice = (_rule, value, callback) => {
      const text = String(value ?? '').trim()
      if (!text) return callback()
      const num = Number(text)
      const cents = Math.round(num * 100)
      if (!Number.isFinite(num) || cents < 1 || cents > 99900)
        return callback(new Error('原价需在 0.01 至 999.00 元之间'))
      const currentPrice = Number(this.form.price)
      if (Number.isFinite(currentPrice) && num < currentPrice)
        return callback(new Error('原价不能低于当前售价'))
      return callback()
    }
    return {
      assetBase: import.meta.env.BASE_URL,
      form: createBlankForm(),
      categories: DISH_CATEGORIES,
      mealOptions: DISH_MEALS.filter((item) => item.key !== 'all'),
      statusOptions: DISH_STATUS_OPTIONS,
      spiceOptions: DISH_SPICE_OPTIONS,
      imageOptions: DISH_IMAGE_OPTIONS,
      badgeOptions: DISH_BADGE_OPTIONS,
      rules: {
        name: [
          { required: true, whitespace: true, message: '请填写菜品名称', trigger: 'blur' },
          { max: 40, message: '菜品名称最多 40 个字符', trigger: 'blur' },
        ],
        price: [{ required: true, validator: validatePrice, trigger: 'blur' }],
        originalPrice: [{ validator: validateOriginalPrice, trigger: 'blur' }],
        category: [{ required: true, message: '请选择菜品分类', trigger: 'change' }],
        meal: [{ required: true, message: '请选择供应餐次', trigger: 'change' }],
        status: [{ required: true, message: '请选择售卖状态', trigger: 'change' }],
        desc: [
          { required: true, whitespace: true, message: '请填写菜品简介', trigger: 'blur' },
          { max: 120, message: '菜品简介最多 120 个字符', trigger: 'blur' },
        ],
      },
    }
  },
  computed: {
    dialogTitle() {
      return this.editing ? '编辑档口菜品' : '新增档口菜品'
    },
    previewSrc() {
      return resolveDishImage(this.form.image, this.assetBase)
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(open) {
        if (open) this.syncFromProps()
      },
    },
    initialDish: {
      deep: true,
      handler() {
        if (this.modelValue) this.syncFromProps()
      },
    },
  },
  methods: {
    syncFromProps() {
      if (this.editing && this.initialDish) {
        this.form = {
          name: this.initialDish.name || '',
          price:
            this.initialDish.price !== undefined && this.initialDish.price !== null
              ? String(this.initialDish.price)
              : '',
          originalPrice:
            this.initialDish.originalPrice !== undefined && this.initialDish.originalPrice !== null
              ? String(this.initialDish.originalPrice)
              : '',
          category: this.initialDish.category || DISH_CATEGORIES[0],
          meal: this.initialDish.meal || 'lunch',
          status: this.initialDish.status || 'success',
          spice: Number.isInteger(Number(this.initialDish.spice))
            ? Number(this.initialDish.spice)
            : 0,
          image: this.initialDish.image || DISH_IMAGE_OPTIONS[0].value,
          badges: Array.isArray(this.initialDish.badges) ? [...this.initialDish.badges] : [],
          desc: this.initialDish.desc || '',
        }
      } else {
        this.form = createBlankForm()
      }
      this.$nextTick(() => this.$refs.dishForm?.clearValidate())
    },
    close() {
      if (this.saving) return
      this.$emit('update:modelValue', false)
    },
    async handleSubmit() {
      if (this.saving) return
      const valid = await this.$refs.dishForm.validate().catch(() => false)
      if (!valid) return
      const payload = buildDishPayload(this.form)
      if (this.editing && this.initialDish.originalPrice != null && !this.form.originalPrice)
        payload.originalPrice = null
      this.$emit('submit', payload)
    },
  },
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="580px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <p v-if="errorMessage" class="form-error" role="alert">
      <AppIcon name="CircleAlert" :size="16" />
      <span>{{ errorMessage }}</span>
    </p>

    <slot name="hint" />

    <el-form
      ref="dishForm"
      :model="form"
      :rules="rules"
      label-position="top"
      :disabled="saving"
      @submit.prevent="handleSubmit"
    >
      <div class="dish-dialog-grid">
        <el-form-item label="菜品名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="例如：招牌红烧肉饭"
            maxlength="40"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="菜品分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择菜品分类">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>

        <el-form-item label="当前售价（元）" prop="price">
          <el-input v-model="form.price" placeholder="例如：16.50" />
        </el-form-item>

        <el-form-item label="划线原价（选填，元）" prop="originalPrice">
          <el-input v-model="form.originalPrice" placeholder="留空表示无划线价" />
        </el-form-item>

        <el-form-item label="供应餐次" prop="meal">
          <el-select v-model="form.meal" placeholder="请选择餐次">
            <el-option
              v-for="item in mealOptions"
              :key="item.key"
              :label="item.label"
              :value="item.key"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="参考辣度" prop="spice">
          <el-radio-group v-model="form.spice">
            <el-radio-button v-for="item in spiceOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
      </div>

      <el-form-item label="售卖状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio-button v-for="item in statusOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <div class="dish-dialog-image-row">
        <el-form-item label="展示配图" prop="image" class="dish-dialog-image-select">
          <el-select v-model="form.image" placeholder="请选择菜品实景配图">
            <el-option
              v-for="item in imageOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <div class="dish-dialog-preview">
          <img :src="previewSrc" alt="菜品配图预览" />
          <span>配图预览</span>
        </div>
      </div>

      <el-form-item label="推荐角标" prop="badges">
        <el-checkbox-group v-model="form.badges">
          <el-checkbox v-for="badge in badgeOptions" :key="badge" :value="badge">
            {{ badge }}
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="菜品简介" prop="desc">
        <el-input
          v-model="form.desc"
          type="textarea"
          :rows="3"
          maxlength="120"
          show-word-limit
          placeholder="介绍食材、口味与特色（1–120 字）"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button plain :disabled="saving" @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" data-testid="save-dish-btn" @click="handleSubmit">
        {{ editing ? '保存修改' : '确认新增' }}
      </el-button>
    </template>
  </el-dialog>
</template>
