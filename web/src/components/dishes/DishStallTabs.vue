<script>
import { ElTabPane, ElTabs } from 'element-plus'
import 'element-plus/theme-chalk/el-tabs.css'
import 'element-plus/theme-chalk/el-tab-pane.css'

export default {
  components: { ElTabs, ElTabPane },
  props: {
    stalls: { type: Array, default: () => [] },
    modelValue: { type: String, default: 'all' },
  },
  emits: ['update:modelValue'],
}
</script>

<template>
  <el-tabs
    :model-value="modelValue"
    class="dish-stall-tabs"
    aria-label="食堂档口"
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
</template>
