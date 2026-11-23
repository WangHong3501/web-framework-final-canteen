<script>
import { mapStores } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import BrandMark from '@/components/ui/BrandMark.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

export default {
  components: { BrandMark, AppIcon, UserAvatar },
  props: {
    active: { type: String, default: 'menu' },
    skipTarget: { type: String, default: '#dish-main-content' },
  },
  methods: {
    focusMain() {
      const main = document.querySelector(this.skipTarget)
      if (main) {
        main.tabIndex = -1
        main.focus()
      }
    },
  },
  computed: {
    ...mapStores(useUserStore, useCartStore),
    user() {
      return this.userStore.user || {}
    },
    cartCount() {
      return this.cartStore.count
    },
  },
}
</script>

<template>
  <a :href="skipTarget" class="skip-link" @click.prevent="focusMain">跳到页面内容</a>
  <header class="dish-topbar">
    <div class="dish-topbar__inner">
      <router-link to="/menu" aria-label="食光校园菜单" class="brand-link">
        <BrandMark compact />
      </router-link>

      <nav class="dish-topbar__nav" aria-label="主导航">
        <router-link to="/menu" :class="{ 'is-active': active === 'menu' || active === 'dish' }">
          校园菜单
        </router-link>
        <router-link v-if="!userStore.isMerchant" to="/cart" class="dish-topbar__cart-link">
          <span>点餐车</span>
          <em v-if="cartCount > 0" class="dish-topbar__badge">{{ cartCount }}</em>
        </router-link>
        <router-link to="/orders">
          {{ userStore.isMerchant ? '订单工作台' : '我的订单' }}
        </router-link>
        <router-link v-if="!userStore.isMerchant" to="/mobile">移动端点餐</router-link>
        <router-link
          v-if="userStore.isMerchant"
          to="/admin/dishes"
          :class="{ 'is-active': active === 'admin' }"
        >
          档口管理
        </router-link>
        <router-link v-if="userStore.isMerchant" to="/admin/overview">经营概览</router-link>
        <router-link to="/center/overview">个人中心</router-link>
      </nav>

      <div class="dish-topbar__right">
        <slot name="actions" />
        <span class="dish-topbar__canteen">
          <AppIcon name="MapPin" :size="15" />
          {{ user.canteen || '第一食堂' }}
        </span>
        <button
          type="button"
          class="dish-topbar__user"
          title="进入个人资料"
          @click="$router.push('/center/profile')"
        >
          <UserAvatar :name="userStore.displayName" :tone="user.avatarTone" :size="34" />
          <span>{{ userStore.displayName }}</span>
        </button>
      </div>
    </div>
  </header>
</template>
