<script>
export default {
  props: {
    name: { type: String, default: '食光' },
    tone: { type: String, default: 'leaf' },
    size: { type: Number, default: 44 },
    interactive: Boolean,
    selected: Boolean,
  },
  emits: ['select'],
  computed: {
    initial() {
      return (this.name || '食光').slice(0, 1)
    },
  },
}
</script>
<template>
  <component
    :is="interactive ? 'button' : 'span'"
    class="avatar"
    :class="[`avatar--${tone}`, { 'avatar--selected': selected }]"
    :style="{ '--avatar-size': `${size}px` }"
    :type="interactive ? 'button' : undefined"
    :aria-label="
      interactive
        ? `选择${{ leaf: '青叶', peach: '蜜桃', sky: '晴空', oat: '燕麦' }[tone]}头像`
        : undefined
    "
    :aria-pressed="interactive ? selected : undefined"
    @click="interactive && $emit('select', tone)"
    >{{ initial }}</component
  >
</template>
