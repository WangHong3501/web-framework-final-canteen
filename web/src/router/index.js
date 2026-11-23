import { createRouter, createWebHashHistory } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { safeDestination, routeAllowsRole } from './policy'

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path !== from.path) return { top: 0 }
  },
  routes: [
    { path: '/', redirect: { name: 'login' } },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { title: '登录' },
    },
    {
      path: '/center',
      component: () => import('@/views/center/CenterLayout.vue'),
      meta: { requiresAuth: true, section: 'account' },
      redirect: { name: 'overview' },
      children: [
        {
          path: 'overview',
          name: 'overview',
          component: () => import('@/views/center/OverviewView.vue'),
          meta: { title: '食光概览' },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/center/ProfileView.vue'),
          meta: { title: '个人资料' },
        },
        {
          path: 'preferences',
          name: 'preferences',
          component: () => import('@/views/center/PreferencesView.vue'),
          meta: { title: '用餐偏好' },
        },
        {
          path: 'security',
          name: 'security',
          component: () => import('@/views/center/SecurityView.vue'),
          meta: { title: '账号安全' },
        },
      ],
    },
    {
      path: '/menu',
      name: 'menu',
      component: () => import('@/views/order/MenuView.vue'),
      meta: { title: '校园菜单', requiresAuth: true, section: 'menu' },
    },
    {
      path: '/dish/:id',
      name: 'dish-detail',
      component: () => import('@/views/order/DishDetailView.vue'),
      meta: { title: '菜品详情', requiresAuth: true, section: 'menu' },
    },
    {
      path: '/cart',
      name: 'cart',
      component: () => import('@/views/order/CartView.vue'),
      meta: { title: '餐车', requiresAuth: true, roles: ['student'], section: 'cart' },
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('@/views/order/OrdersView.vue'),
      meta: { title: '订单', requiresAuth: true, section: 'orders' },
    },
    {
      path: '/order/:id',
      name: 'order-detail',
      component: () => import('@/views/order/OrderDetailView.vue'),
      meta: { title: '订单详情', requiresAuth: true, section: 'orders' },
    },
    {
      path: '/mobile',
      name: 'mobile-order',
      component: () => import('@/views/order/MenuView.vue'),
      meta: { title: '校园菜单', requiresAuth: true, roles: ['student'], section: 'menu' },
    },
    {
      path: '/admin/overview',
      name: 'admin-overview',
      component: () => import('@/views/order/AdminDashboardView.vue'),
      meta: { title: '经营概览', requiresAuth: true, roles: ['merchant'], section: 'business' },
    },
    {
      path: '/admin/dishes',
      name: 'admin-dishes',
      component: () => import('@/views/order/AdminDishesView.vue'),
      meta: { title: '菜品管理', requiresAuth: true, roles: ['merchant'], section: 'dishes' },
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: () => import('@/views/system/StatusView.vue'),
      meta: { title: '无访问权限', status: 'forbidden' },
    },
    {
      path: '/service-unavailable',
      name: 'unavailable',
      component: () => import('@/views/system/StatusView.vue'),
      meta: { title: '服务暂不可用', status: 'unavailable' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/system/StatusView.vue'),
      meta: { title: '页面未找到', status: 'not-found' },
    },
  ],
})

router.beforeEach(async (to) => {
  const user = useUserStore()
  const protectedRoute = to.matched.some((record) => record.meta.requiresAuth)
  if (protectedRoute || (to.name === 'login' && user.isAuthenticated)) {
    try {
      const authenticated = await user.verifySession()
      if (!authenticated && protectedRoute)
        return { name: 'login', query: { redirect: safeDestination(to.fullPath) }, replace: true }
      if (authenticated) useCartStore().bindAccount(user.user.id)
      if (authenticated && !routeAllowsRole(to.matched, user.user.role))
        return { name: 'forbidden', replace: true }
      if (authenticated && to.name === 'login')
        return safeDestination(to.query.redirect, user.user.role)
    } catch {
      return {
        name: 'unavailable',
        query: {
          redirect: safeDestination(
            to.name === 'login' ? to.query.redirect : to.fullPath,
            user.user?.role,
          ),
        },
        replace: true,
      }
    }
  }
  return true
})
router.afterEach((to) => {
  document.title = `${to.meta.title || '校园点餐'} · 食光校园`
})
export default router
