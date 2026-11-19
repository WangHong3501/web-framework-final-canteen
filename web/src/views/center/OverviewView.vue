<script>
import StatusTag from '@/components/ui/StatusTag.vue'
import FoodCard from '@/components/ui/FoodCard.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import OrderStatusFlow from '@/components/ui/OrderStatusFlow.vue'
import PickupCode from '@/components/ui/PickupCode.vue'
import MealSwitch from '@/components/ui/MealSwitch.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { mapStores } from 'pinia'
import { useUserStore } from '@/stores/user'
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
    FoodCard,
    PriceTag,
    OrderStatusFlow,
    PickupCode,
    MealSwitch,
    EmptyState,
  },
  data() {
    return {
      summary: null,
      loading: true,
      error: '',
      assetBase: import.meta.env.BASE_URL,
      now: new Date(),
      meal: 'lunch',
      testFood: {
        name: '招牌红烧肉饭',
        desc: '肥而不腻，招牌必点',
        price: 12,
        originalPrice: 15,
        image: `${import.meta.env.BASE_URL}images/hongshaorou.jpg`,
        status: 'success',
        badges: ['招牌'],
        spice: 1,
      },
      soldFood: {
        name: '香煎鸡腿饭',
        desc: '外酥里嫩，午间人气王',
        price: 14,
        image: `${import.meta.env.BASE_URL}images/jilifan.jpg`,
        status: 'sold',
        badges: ['新品'],
        tags: [{ type: 'veg', text: '含时蔬' }],
      },
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
      return status === 'completed' ? '已完成' : '待取餐'
    },
    orderTagType(status) {
      return status === 'completed' ? 'success' : 'warning'
    },
  },
}
</script>

<template>
  <div ref="page" class="overview-page">
    <!-- 组件规范演示区：答辩用，正式上线可删除 -->
    <section class="component-test" data-enter>
      <SectionPanel title="组件规范预览" subtitle="统一设计令牌 · 双端一致的业务组件">
        <div class="spec-group">
          <span class="spec-caption">状态标签</span>
          <div class="spec-row">
            <StatusTag type="success" text="可点餐" />
            <StatusTag type="warning" text="余量少" />
            <StatusTag type="danger" text="已售罄" />
            <StatusTag type="info" text="已下架" />
            <StatusTag type="brand" text="招牌" />
            <StatusTag type="new" text="新品" />
            <StatusTag type="hot" text="微辣" />
            <StatusTag type="veg" text="素食" />
            <StatusTag type="halal" text="清真" />
          </div>
        </div>

        <div class="spec-group">
          <span class="spec-caption">菜品卡片（4:3 图片 · 售罄遮罩 · 价格规范）</span>
          <div class="spec-row spec-row--cards">
            <FoodCard :food="testFood">
              <template #action>
                <button class="text-button" type="button">加入餐车</button>
              </template>
            </FoodCard>
            <FoodCard :food="soldFood" />
          </div>
        </div>

        <div class="spec-group">
          <span class="spec-caption">价格组件（列表价 / 辅助价 / 划线原价 / 详情大价）</span>
          <div class="spec-row">
            <PriceTag :value="12" />
            <PriceTag :value="12.5" variant="muted" />
            <PriceTag :value="9.9" :original="15" />
            <PriceTag :value="26" size="lg" />
          </div>
        </div>

        <div class="spec-row spec-row--split">
          <div class="spec-group">
            <span class="spec-caption">订单状态流</span>
            <OrderStatusFlow status="ready" />
          </div>
          <div class="spec-group">
            <span class="spec-caption">取餐码</span>
            <PickupCode code="A28" window="3 号窗口" eta="12:20 前" size="sm" />
          </div>
        </div>

        <div class="spec-group">
          <span class="spec-caption">餐次切换</span>
          <MealSwitch v-model="meal" />
        </div>
      </SectionPanel>
    </section>

    <div class="page-heading" data-enter>
      <div>
        <p class="breadcrumb">个人中心 / 食光概览</p>
        <h1>
          {{ greeting }}，{{ userStore.displayName
          }}<AppIcon class="greeting-sun" :name="greetingIcon" :size="27" />
        </h1>
        <p>从一顿好饭开始，把今天过得有滋有味。</p>
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
        <span class="hero-leaf"><AppIcon name="Leaf" :size="17" />属于你的校园食光</span>
        <h2>生活有滋有味，<br />每一餐都合你心意。</h2>
        <p>记住你的口味，照顾你的习惯。<br />让简单的一日三餐，多一点被惦记的感觉。</p>
        <router-link to="/center/preferences" class="button-link"
          >设置我的用餐偏好<AppIcon name="ArrowRight" :size="18"
        /></router-link>
      </div>
      <div class="overview-hero__photo">
        <img :src="`${assetBase}images/fresh-bowl.jpg`" alt="新鲜蔬菜与谷物搭配的营养餐碗" /><span
          class="food-caption"
          ><AppIcon name="Heart" :size="15" />认真吃饭，认真生活</span
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
          ><small>我的订单</small><strong>{{ summary.totalOrders }}<em>笔</em></strong></span
        >
      </div>
      <div>
        <span class="metric-icon metric-icon--warm"><AppIcon name="Clock3" /></span
        ><span
          ><small>待取餐</small><strong>{{ summary.pendingOrders }}<em>笔</em></strong></span
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
        subtitle="认识你，也记住你的习惯"
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
        subtitle="这一份好味道，由你来定义"
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

    <SectionPanel
      title="最近的点餐记录"
      subtitle="每一餐的好食光，都值得记住"
      action-label="查看订单"
      @action="$router.push('/orders')"
    >
      <div v-if="summary?.recentOrders?.length" class="recent-orders">
        <div v-for="order in summary.recentOrders" :key="order.id">
          <span class="order-id">订单 {{ order.id }}</span>
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
.component-test {
  margin-bottom: 24px;
}

.spec-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spec-group + .spec-group,
.spec-row + .spec-group {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px dashed var(--line);
}

.spec-caption {
  display: block;
  font-size: 12px;
  color: var(--muted);
}

.spec-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.spec-row--cards {
  gap: 16px;
}

.spec-row--cards > * {
  flex: 0 0 272px;
  max-width: 100%;
}

.spec-row--split {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 28px;
  align-items: start;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px dashed var(--line);
}

.spec-row--split .spec-row + .spec-group {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.recent-orders > div {
  align-items: center;
}

.recent-orders .order-id {
  margin-right: auto;
}

@media (max-width: 900px) {
  .spec-row--split {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}
</style>
