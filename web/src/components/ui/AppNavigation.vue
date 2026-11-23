<script>
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import AppIcon from './AppIcon.vue'
import BrandMark from './BrandMark.vue'

const studentLinks = [
  { section: 'menu', name: 'menu', label: '点餐', icon: 'Utensils' },
  { section: 'cart', name: 'cart', label: '餐车', icon: 'ShoppingCart' },
  { section: 'orders', name: 'orders', label: '订单', icon: 'ReceiptText' },
  { section: 'account', name: 'overview', label: '我的', icon: 'UserRound' },
]

const merchantLinks = [
  { section: 'orders', name: 'orders', label: '订单工作台', icon: 'ReceiptText' },
  { section: 'dishes', name: 'admin-dishes', label: '菜品管理', icon: 'Store' },
  { section: 'business', name: 'admin-overview', label: '经营概览', icon: 'LayoutDashboard' },
  { section: 'account', name: 'overview', label: '账号', icon: 'UserRound' },
]

export default {
  components: { AppIcon, BrandMark },
  computed: {
    user: () => useUserStore(),
    cart: () => useCartStore(),
    links() {
      return this.user.isMerchant ? merchantLinks : studentLinks
    },
    activeSection() {
      if (this.$route.name === 'dish-detail' && this.$route.query.from === 'orders') return 'orders'
      const section = this.$route.meta.section
      return this.user.isMerchant && section === 'menu' ? 'dishes' : section
    },
  },
}
</script>

<template>
  <header class="workspace-header">
    <div class="workspace-header__inner">
      <BrandMark compact />
      <nav class="workspace-nav" aria-label="主导航">
        <router-link
          v-for="link in links"
          :key="link.name"
          v-slot="{ href, navigate, isExactActive }"
          :to="$route.name === link.name ? $route.fullPath : { name: link.name }"
          custom
        >
          <a
            :href="href"
            :aria-current="
              isExactActive ? 'page' : activeSection === link.section ? 'location' : undefined
            "
            :aria-description="
              link.section === 'cart' && cart.count ? `已选 ${cart.count} 份` : undefined
            "
            class="workspace-nav__link"
            @click="navigate"
          >
            <span class="workspace-nav__glyph">
              <AppIcon :name="link.icon" :size="19" />
              <span
                v-if="link.section === 'cart' && cart.count"
                class="workspace-nav__count"
                aria-hidden="true"
              >
                {{ cart.count > 99 ? '99+' : cart.count }}
              </span>
            </span>
            <span>{{ link.label }}</span>
          </a>
        </router-link>
      </nav>
      <span class="workspace-header__account">{{ user.displayName }}</span>
    </div>
  </header>
</template>

<style scoped>
.workspace-header {
  position: sticky;
  top: 0;
  z-index: var(--z-raised);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.workspace-header__inner {
  max-width: 1264px;
  min-height: calc(var(--workspace-header-height) - 1px);
  margin: 0 auto;
  padding: 0 var(--space-7);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-4);
}

.workspace-header__account {
  justify-self: end;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
  font-size: var(--fs-13);
}

.workspace-nav {
  display: flex;
  align-items: stretch;
  align-self: stretch;
  gap: var(--space-2);
}

.workspace-nav__link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--size-control);
  padding: 0 var(--space-4);
  border-block: 2px solid transparent;
  color: var(--gray-600);
  white-space: nowrap;
}

.workspace-nav__link:hover {
  background: var(--brand-50);
  color: var(--forest);
}

.workspace-nav__link[aria-current] {
  border-bottom-color: var(--forest);
  color: var(--forest);
  font-weight: var(--fw-semibold);
}

.workspace-nav__link:focus-visible {
  outline-offset: -4px;
}

.workspace-nav__glyph {
  position: relative;
}

.workspace-nav__count {
  position: absolute;
  top: calc(-1 * var(--space-2));
  right: calc(-1 * var(--space-2));
  min-width: var(--space-4);
  padding-inline: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--forest);
  color: var(--white);
  font-size: var(--fs-10);
  line-height: var(--space-4);
  text-align: center;
}

@media (max-width: 767px) {
  .workspace-header {
    position: static;
  }

  .workspace-header__inner {
    min-height: 54px;
    display: flex;
    padding-inline: var(--space-4);
    justify-content: space-between;
  }

  .workspace-header__inner :deep(.brand__symbol) {
    width: var(--space-7);
    height: var(--space-7);
  }

  .workspace-header__inner :deep(.brand__wordmark) {
    font-size: var(--fs-16);
  }

  .workspace-nav {
    position: fixed;
    inset: auto 0 0;
    z-index: var(--z-raised);
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    height: var(--workspace-bottom-nav);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    border-top: 1px solid var(--line);
    background: var(--surface);
  }

  .workspace-nav__link {
    flex-direction: column;
    gap: var(--space-1);
    padding: 0;
    font-size: var(--fs-12);
    line-height: var(--lh-aux);
  }

  .workspace-nav__link[aria-current] {
    border-top-color: var(--forest);
    border-bottom-color: transparent;
    background: var(--brand-50);
  }
}
</style>
