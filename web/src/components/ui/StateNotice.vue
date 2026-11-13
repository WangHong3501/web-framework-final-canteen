<script>
import AppIcon from './AppIcon.vue'
export default {
  components: { AppIcon },
  props: {
    title: { type: String, required: true },
    detail: { type: String, default: '' },
    actionLabel: { type: String, default: '' },
    kind: { type: String, default: 'empty' },
    compact: Boolean,
  },
  emits: ['retry'],
}
</script>
<template>
  <div
    class="state-notice"
    :class="{ 'state-notice--compact': compact }"
    :role="kind === 'error' ? 'alert' : 'status'"
  >
    <span class="state-notice__icon"
      ><slot name="icon"
        ><AppIcon
          :name="kind === 'error' ? 'CircleAlert' : 'Soup'"
          :size="compact ? 25 : 34" /></slot
    ></span>
    <h3>{{ title }}</h3>
    <p v-if="detail">{{ detail }}</p>
    <el-button v-if="actionLabel" plain @click="$emit('retry')">{{ actionLabel }}</el-button>
  </div>
</template>
