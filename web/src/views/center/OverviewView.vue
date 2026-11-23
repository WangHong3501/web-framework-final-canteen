<script>
import StatusTag from '@/components/ui/StatusTag.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { mapStores } from 'pinia'
import { useUserStore } from '@/stores/user'
import { STATUS_LABEL, STATUS_TYPE } from '@/shared/order'
import { accountApi } from '@/api/account'
import { requestMessage } from '@/api/http'
import { mountScene } from '@/utils/motion'
import { campusGreeting } from '@/utils/time'
import AppIcon from '@/components/ui/AppIcon.vue'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import StateNotice from '@/components/ui/StateNotice.vue'

export default {
  components: {
    AppIcon,
    SectionPanel,
    StateNotice,
    StatusTag,
    PriceTag,
    EmptyState,
  },
  data() {
    return {
      summary: null,
      loading: true,
      error: '',
      assetBase: import.meta.env.BASE_URL,
      now: new Date(),
    }
  },
  computed: {
    ...mapStores(useUserStore),
    greeting() {
      return campusGreeting(this.now).text
    },
    greetingIcon() {
      return campusGreeting(this.now).icon
    },
    user() {
      return this.userStore.user || {}
    },
    flavorSummary() {
      return this.user.preferences?.cuisines?.length
        ? this.user.preferences.cuisines.join('、')
        : '发现自己的专属好味道'
    },
    profileItems() {
      return [
        { icon: 'UserRound', label: '昵称', value: this.userStore.displayName },
        {
          icon: 'GraduationCap',
          label: this.userStore.isMerchant ? '商家账号' : '学号',
          value: this.user.studentId || this.user.account,
        },
        { icon: 'MapPin', label: '常去食堂', value: this.user.canteen },
        { icon: 'Phone', label: '手机号', value: this.user.phone || '尚未填写' },
      ]
    },
  },
  mounted() {
    this._motion = mountScene(this.$refs.page)
    this._clock = window.setInterval(() => {
      this.now = new Date()
    }, 60000)
    this.loadSummary()
  },
  beforeUnmount() {
    this._motion?.revert()
    window.clearInterval(this._clock)
  },
  methods: {
    async loadSummary() {
      this.loading = true
      this.error = ''
      try {
        this.summary = await accountApi.summary()
      } catch (error) {
        this.error = requestMessage(error)
      } finally {
        this.loading = false
      }
    },
    orderLabel(status) {
      return STATUS_LABEL[status] || '未知状态'
    },
    orderTagType(status) {
      return STATUS_TYPE[status] || 'info'
    },
  },
}
</script>

<template>
  <div ref="page" class="overview-page">
    <div class="page-heading" data-enter>
      <div>
        <p class="breadcrumb">个人中心 / 食光概览</p>
        <h1>
          {{ greeting }}，{{ userStore.displayName
          }}<AppIcon class="greeting-sun" :name="greetingIcon" :size="27" />
        </h1>
      </div>
      <span class="date-chip"
        ><AppIcon name="CalendarDays" :size="16" />{{
          new Date().toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            timeZone: 'Asia/Shanghai',
          })
        }}</span
      >
    </div>

    <section class="overview-hero" data-enter>
      <div class="overview-hero__copy">
        <span class="hero-leaf"
          ><AppIcon name="Leaf" :size="17" />{{
            userStore.isMerchant ? '档口工作台' : user.canteen
          }}</span
        >
        <h2>{{ userStore.isMerchant ? '今天的档口经营' : '今天，想吃点什么？' }}</h2>
        <p>
          {{
            userStore.isMerchant
              ? '查看本档口订单、热销菜品和售罄提醒。'
              : '挑好菜品，按档口下单，凭取餐码到窗口取餐。'
          }}
        </p>
        <router-link :to="userStore.isMerchant ? '/admin/overview' : '/menu'" class="button-link"
          >{{ userStore.isMerchant ? '打开经营概览' : '浏览今日菜单'
          }}<AppIcon name="ArrowRight" :size="18"
        /></router-link>
      </div>
      <div class="overview-hero__photo">
        <img :src="`${assetBase}images/fresh-bowl.jpg`" alt="新鲜蔬菜与谷物搭配的营养餐碗" /><span
          class="food-caption"
          ><AppIcon name="Heart" :size="15" />校园食堂</span
        >
      </div>
    </section>

    <div v-if="loading" class="metrics-strip" aria-label="正在加载账户摘要">
      <el-skeleton :rows="1" animated />
    </div>
    <StateNotice
      v-else-if="error"
      :title="error"
      kind="error"
      action-label="重新加载"
      compact
      @retry="loadSummary"
    />
    <section
      v-else-if="summary"
      class="metrics-strip"
      aria-label="账户摘要"
      data-testid="account-summary"
    >
      <div>
        <span class="metric-icon"><AppIcon name="ShoppingBag" /></span
        ><span
          ><small>{{ userStore.isMerchant ? '本档口订单' : '我的订单' }}</small
          ><strong>{{ summary.totalOrders }}<em>笔</em></strong></span
        >
      </div>
      <div>
        <span class="metric-icon metric-icon--warm"><AppIcon name="Clock3" /></span
        ><span
          ><small>待取餐</small><strong>{{ summary.readyOrders }}<em>笔</em></strong></span
        >
      </div>
      <div>
        <span class="metric-icon metric-icon--blue"><AppIcon name="CircleUserRound" /></span
        ><span
          ><small>资料完整度</small
          ><strong>{{ userStore.profileCompletion }}<em>%</em></strong></span
        ><router-link
          v-if="userStore.profileCompletion < 100"
          to="/center/profile"
          class="metric-action"
          >去完善<AppIcon name="ChevronRight" :size="14"
        /></router-link>
      </div>
    </section>

    <div class="overview-grid" data-enter>
      <SectionPanel
        title="我的校园名片"
        action-label="编辑资料"
        @action="$router.push('/center/profile')"
        ><dl class="identity-list">
          <div v-for="item in profileItems" :key="item.label">
            <dt><AppIcon :name="item.icon" :size="17" />{{ item.label }}</dt>
            <dd :class="{ 'muted-text': item.value === '尚未填写' }">{{ item.value }}</dd>
          </div>
        </dl>
        <div class="identity-note">
          <AppIcon name="ShieldCheck" :size="16" />你的账户资料，仅用于本人的校园服务
        </div></SectionPanel
      >
      <SectionPanel
        title="用餐小偏好"
        action-label="调整偏好"
        @action="$router.push('/center/preferences')"
        ><div class="preference-preview">
          <span class="preference-preview__illustration"><AppIcon name="Soup" :size="45" /></span>
          <h3>{{ flavorSummary }}</h3>
          <p>常用取餐时段 {{ user.preferences?.mealTime || '尚未设置' }}</p>
          <div class="preference-tags">
            <span
              ><AppIcon name="Leaf" :size="14" />{{
                { none: '不吃辣', mild: '微辣刚刚好', medium: '喜欢中辣', hot: '无辣不欢' }[
                  user.preferences?.spice
                ] || '口味随心'
              }}</span
            ><span>{{
              user.preferences?.avoidIngredients?.length
                ? `不喜欢${user.preferences.avoidIngredients.join('、')}`
                : '新鲜食材，都想尝尝'
            }}</span>
          </div>
        </div></SectionPanel
      >
    </div>

    <SectionPanel title="最近的点餐记录" action-label="查看订单" @action="$router.push('/orders')">
      <div v-if="summary?.recentOrders?.length" class="recent-orders">
        <div v-for="order in summary.recentOrders" :key="order.id">
          <router-link class="order-id" :to="{ name: 'order-detail', params: { id: order.id } }"
            >订单 {{ order.id }}</router-link
          >
          <StatusTag
            :type="orderTagType(order.status)"
            :text="orderLabel(order.status)"
            size="sm"
            dot
          />
          <PriceTag :value="order.total" size="sm" />
        </div>
      </div>
      <EmptyState
        v-else
        title="好食光，从下一餐开始"
        detail="还没有点餐记录。先完善口味偏好，期待下一次美味相遇。"
        action-label="设置用餐偏好"
        icon="ReceiptText"
        compact
        @action="$router.push('/center/preferences')"
      />
    </SectionPanel>
  </div>
</template>

<style scoped>
.recent-orders > div {
  align-items: center;
}

.recent-orders .order-id {
  margin-right: auto;
}
</style>
