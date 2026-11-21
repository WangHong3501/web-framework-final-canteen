<script>
import { ElTabPane, ElTabs } from 'element-plus'
import 'element-plus/theme-chalk/el-tabs.css'
import 'element-plus/theme-chalk/el-tab-pane.css'
import AppIcon from '@/components/ui/AppIcon.vue'

export default {
  components: { ElTabs, ElTabPane, AppIcon },
  props: {
    stalls: { type: Array, default: () => [] },
    modelValue: { type: String, default: 'all' },
    totalCount: { type: Number, default: 0 },
    filteredCount: { type: Number, default: 0 },
  },
  emits: ['update:modelValue', 'reset'],
  computed: {
    activeStall() {
      if (!this.modelValue || this.modelValue === 'all') return null
      return this.stalls.find((item) => String(item.id) === String(this.modelValue)) || null
    },
  },
}
</script>

<template>
  <section class="dish-stall-panel" aria-label="按食堂档口切换">
    <el-tabs
      :model-value="modelValue"
      class="dish-stall-tabs"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <el-tab-pane label="全部档口" name="all" />
      <el-tab-pane
        v-for="stall in stalls"
        :key="stall.id"
        :label="stall.window ? `${stall.name} · ${stall.window}` : stall.name"
        :name="stall.id"
      />
    </el-tabs>

    <div class="dish-stall-panel__foot">
      <div class="dish-stall-panel__summary">
        <span v-if="activeStall" class="dish-stall-panel__info">
          <AppIcon name="Store" :size="15" />
          <strong>{{ activeStall.name }}</strong>
          <span>{{ activeStall.canteen }}</span>
          <span v-if="activeStall.window">{{ activeStall.window }}</span>
          <span v-if="activeStall.desc">· {{ activeStall.desc }}</span>
        </span>
        <span v-else class="dish-stall-panel__info">
          <AppIcon name="Utensils" :size="15" />
          <span>共 {{ totalCount }} 道菜品，当前展示 {{ filteredCount }} 道</span>
        </span>
      </div>
      <slot name="extra" />
    </div>
  </section>
</template>
