<script>
export default {
  props: {
    label: { type: String, default: '移动端演示' },
  },
}
</script>

<template>
  <div class="phone-stage">
    <div class="phone-stage__caption">{{ label }}</div>
    <div class="phone-frame">
      <div class="phone-frame__notch" aria-hidden="true"></div>
      <div class="phone-frame__screen" role="region" :aria-label="label" tabindex="0">
        <slot />
      </div>
      <div class="phone-frame__bar" aria-hidden="true"></div>
    </div>
  </div>
</template>

<style scoped>
.phone-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}
.phone-stage__caption {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-13);
  color: var(--muted);
}
.phone-frame {
  position: relative;
  width: 390px;
  max-width: 100%;
  background: var(--white);
  border: 10px solid var(--gray-800);
  border-radius: 44px;
  box-shadow:
    var(--shadow-4),
    0 0 0 2px #0c1310;
  overflow: hidden;
}
.phone-frame__notch {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 132px;
  height: 24px;
  background: var(--gray-800);
  border-radius: 0 0 16px 16px;
  z-index: 20;
}
.phone-frame__screen {
  height: min(720px, calc(100dvh - 180px));
  min-height: 320px;
  overflow-y: auto;
  background: var(--canvas);
  scrollbar-width: none;
}
.phone-frame__bar {
  position: absolute;
  bottom: 7px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.5);
  z-index: 20;
}
</style>
