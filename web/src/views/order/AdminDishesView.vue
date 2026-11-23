<script>
import '@/styles/order.css'
import '@/components/dishes/dishes.css'
import { ElLoading, ElMessage, ElMessageBox, ElTable, ElTableColumn } from 'element-plus'
import 'element-plus/theme-chalk/el-table.css'
import 'element-plus/theme-chalk/el-table-column.css'
import 'element-plus/theme-chalk/el-loading.css'
import { mapStores } from 'pinia'
import { dishesApi } from '@/api/dishes'
import { requestMessage } from '@/api/http'
import { useUserStore } from '@/stores/user'
import DishTopBar from '@/components/dishes/DishTopBar.vue'
import DishFormDialog from '@/components/dishes/DishFormDialog.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import StatusTag from '@/components/ui/StatusTag.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import {
  DISH_CATEGORIES,
  DISH_STATUS_OPTIONS,
  filterDishList,
  mealLabel,
  resolveDishImage,
  statusLabel,
} from '@/components/dishes/dish-meta'

export default {
  components: {
    ElTable,
    ElTableColumn,
    DishTopBar,
    DishFormDialog,
    AppIcon,
    StatusTag,
    PriceTag,
    EmptyState,
  },
  directives: {
    loading: ElLoading.directive,
  },
  data() {
    return {
      assetBase: import.meta.env.BASE_URL,
      dishes: [],
      stalls: [],
      loading: true,
      errorMsg: '',
      keyword: '',
      categoryFilter: '全部',
      statusFilter: 'all',
      actingId: '',
      dialogOpen: false,
      editing: false,
      editingDish: null,
      saving: false,
      dialogError: '',
      categories: ['全部', ...DISH_CATEGORIES],
      statusOptions: [...DISH_STATUS_OPTIONS, { value: 'unlisted', label: '已下架' }],
    }
  },
  computed: {
    ...mapStores(useUserStore),
    stallId() {
      return this.userStore.user?.stallId || ''
    },
    ownStall() {
      return this.stalls.find((item) => String(item.id) === String(this.stallId)) || null
    },
    ownStallLabel() {
      if (!this.ownStall) return this.userStore.user?.displayName || this.stallId || '当前档口'
      return `${this.ownStall.name}（${this.ownStall.canteen}${
        this.ownStall.window ? ` · ${this.ownStall.window}` : ''
      }）`
    },
    ownDishes() {
      if (!this.stallId) return []
      return this.dishes.filter((item) => String(item.stallId) === String(this.stallId))
    },
    visibleDishes() {
      const source =
        this.statusFilter === 'all'
          ? this.ownDishes
          : this.ownDishes.filter((dish) =>
              this.statusFilter === 'unlisted' ? dish.listed === false : dish.listed !== false,
            )
      return filterDishList(source, {
        category: this.categoryFilter,
        keyword: this.keyword,
        status: this.statusFilter === 'unlisted' ? 'all' : this.statusFilter,
      })
    },
    successCount() {
      return this.ownDishes.filter((item) => item.listed !== false && item.status === 'success')
        .length
    },
    warningCount() {
      return this.ownDishes.filter((item) => item.listed !== false && item.status === 'warning')
        .length
    },
    dangerCount() {
      return this.ownDishes.filter((item) => item.listed !== false && item.status === 'danger')
        .length
    },
    hasFilter() {
      return (
        this.categoryFilter !== '全部' ||
        this.statusFilter !== 'all' ||
        Boolean(this.keyword.trim())
      )
    },
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      this.errorMsg = ''
      try {
        const [dishes, stalls] = await Promise.all([
          dishesApi.list({ stallId: this.stallId, manage: '1' }),
          dishesApi.stalls(),
        ])
        this.dishes = Array.isArray(dishes) ? dishes : []
        this.stalls = Array.isArray(stalls) ? stalls : []
      } catch (error) {
        this.errorMsg = requestMessage(error, '菜品加载失败，请稍后重试。')
      } finally {
        this.loading = false
      }
    },
    imageOf(dish) {
      return resolveDishImage(dish.image, this.assetBase)
    },
    statusText(key) {
      return statusLabel(key)
    },
    mealText(key) {
      return mealLabel(key)
    },
    openAdd() {
      this.editing = false
      this.editingDish = null
      this.dialogError = ''
      this.dialogOpen = true
    },
    openEdit(dish) {
      this.editing = true
      this.editingDish = { ...dish }
      this.dialogError = ''
      this.dialogOpen = true
    },
    async handleDialogSubmit(payload) {
      if (this.saving) return
      this.saving = true
      this.dialogError = ''
      try {
        if (this.editing && this.editingDish?.id) {
          await dishesApi.update(this.editingDish.id, payload)
        } else {
          await dishesApi.create(payload)
        }
        await this.load()
        this.dialogOpen = false
        ElMessage.success(this.editing ? '菜品已更新' : '菜品已新增')
      } catch (error) {
        this.dialogError = requestMessage(error, '保存菜品失败，请核对表单后重试。')
      } finally {
        this.saving = false
      }
    },
    async toggleStatus(dish) {
      if (this.actingId) return
      const next = dish.listed === false
      const label = next ? '上架' : '下架'
      try {
        await ElMessageBox.confirm(`确定将「${dish.name}」设为「${label}」吗？`, '调整售卖状态', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info',
        })
      } catch {
        return
      }
      this.actingId = dish.id
      try {
        await dishesApi.update(dish.id, { listed: next })
        await this.load()
        ElMessage.success(`「${dish.name}」已${label}`)
      } catch (error) {
        ElMessage.error(requestMessage(error, '更新菜品状态失败，请重试。'))
      } finally {
        this.actingId = ''
      }
    },
    async removeDish(dish) {
      if (this.actingId) return
      try {
        await ElMessageBox.confirm(
          `确定删除「${dish.name}」吗？删除后将从校园菜单中移除。`,
          '删除菜品',
          {
            confirmButtonText: '确认删除',
            cancelButtonText: '保留',
            type: 'warning',
          },
        )
      } catch {
        return
      }
      this.actingId = dish.id
      try {
        await dishesApi.remove(dish.id)
        await this.load()
        ElMessage.success('菜品已删除')
      } catch (error) {
        ElMessage.error(requestMessage(error, '删除菜品失败，请稍后重试。'))
      } finally {
        this.actingId = ''
      }
    },
    resetFilters() {
      this.keyword = ''
      this.categoryFilter = '全部'
      this.statusFilter = 'all'
    },
  },
}
</script>

<template>
  <div class="dish-shell">
    <DishTopBar active="admin">
      <template #actions>
        <el-button plain size="small" @click="$router.push('/menu')">查看学生端菜单</el-button>
      </template>
    </DishTopBar>

    <main id="dish-main-content" class="dish-main">
      <div class="admin-page">
        <div class="admin-hero">
          <div>
            <p class="admin-breadcrumb">档口商家工作台 / 菜品管理</p>
            <h1>欢迎来到档口工作台</h1>
            <p class="admin-subtitle">
              <AppIcon name="Store" :size="15" />
              <span
                >当前绑定档口：<strong>{{ ownStallLabel }}</strong></span
              >
            </p>
          </div>
          <div class="admin-hero__actions">
            <el-button plain @click="$router.push('/center/overview')">回到个人中心</el-button>
            <el-button type="primary" data-testid="add-dish-btn" @click="openAdd">
              <AppIcon name="Plus" :size="16" /> 新增菜品
            </el-button>
          </div>
        </div>

        <section class="admin-metrics" aria-label="档口菜品统计">
          <div class="admin-metric-card">
            <span>本档口菜品</span>
            <strong data-testid="metric-total">{{ ownDishes.length }}</strong>
          </div>
          <div class="admin-metric-card">
            <span>可点餐</span>
            <strong data-testid="metric-success">{{ successCount }}</strong>
          </div>
          <div class="admin-metric-card">
            <span>余量少</span>
            <strong data-testid="metric-warning">{{ warningCount }}</strong>
          </div>
          <div class="admin-metric-card">
            <span>已售罄</span>
            <strong data-testid="metric-danger">{{ dangerCount }}</strong>
          </div>
        </section>

        <div class="admin-toolbar">
          <el-input
            v-model="keyword"
            placeholder="搜索本档口菜品名称或简介"
            aria-label="搜索本档口菜品"
            clearable
            class="admin-search"
          >
            <template #prefix><AppIcon name="Search" :size="16" /></template>
          </el-input>

          <div class="admin-chips" role="group" aria-label="按分类筛选">
            <button
              v-for="cat in categories"
              :key="cat"
              type="button"
              class="admin-chip"
              :class="{ 'is-active': categoryFilter === cat }"
              :aria-pressed="categoryFilter === cat"
              @click="categoryFilter = cat"
            >
              {{ cat }}
            </button>
          </div>

          <div class="admin-chips" role="group" aria-label="按售卖状态筛选">
            <button
              type="button"
              class="admin-chip"
              :class="{ 'is-active': statusFilter === 'all' }"
              :aria-pressed="statusFilter === 'all'"
              @click="statusFilter = 'all'"
            >
              全部状态
            </button>
            <button
              v-for="item in statusOptions"
              :key="item.value"
              type="button"
              class="admin-chip"
              :class="{ 'is-active': statusFilter === item.value }"
              :aria-pressed="statusFilter === item.value"
              @click="statusFilter = item.value"
            >
              {{ item.label }}
            </button>
          </div>

          <span class="admin-count">共 {{ visibleDishes.length }} 道菜</span>
        </div>

        <div v-if="errorMsg" class="admin-error" role="alert">
          <AppIcon name="CircleAlert" :size="18" />
          <span>{{ errorMsg }}</span>
          <el-button size="small" @click="load">重试</el-button>
        </div>

        <EmptyState
          v-else-if="!loading && !visibleDishes.length"
          :title="hasFilter ? '没有匹配的菜品' : '还没有菜品'"
          :detail="
            hasFilter
              ? '可以重置筛选条件查看本档口全部菜品。'
              : '点击右上角新增菜品，丰富你的档口菜单。'
          "
          :action-label="hasFilter ? '重置筛选' : '新增菜品'"
          icon="Store"
          @action="hasFilter ? resetFilters() : openAdd()"
        />

        <div v-else class="admin-table-wrap">
          <el-table
            v-loading="loading"
            :data="visibleDishes"
            row-key="id"
            class="admin-table"
            stripe
            empty-text="暂无菜品"
            data-testid="admin-dishes-table"
          >
            <el-table-column label="菜品" min-width="230">
              <template #default="{ row }">
                <div class="table-dish">
                  <img :src="imageOf(row)" :alt="row.name" />
                  <div>
                    <router-link :to="`/dish/${row.id}`" class="table-dish__link">
                      {{ row.name }}
                    </router-link>
                    <span>{{ row.desc }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="分类" width="110">
              <template #default="{ row }">{{ row.category }}</template>
            </el-table-column>

            <el-table-column label="餐次" width="82">
              <template #default="{ row }">{{ mealText(row.meal) }}</template>
            </el-table-column>

            <el-table-column label="价格" width="128">
              <template #default="{ row }">
                <PriceTag :value="row.price" :original="row.originalPrice" size="sm" />
              </template>
            </el-table-column>

            <el-table-column label="状态" width="112">
              <template #default="{ row }">
                <StatusTag
                  :type="row.listed === false ? 'sold' : row.status"
                  :text="row.listed === false ? '已下架' : statusText(row.status)"
                  dot
                />
              </template>
            </el-table-column>

            <el-table-column label="操作" width="248">
              <template #default="{ row }">
                <div class="admin-row-actions">
                  <el-button
                    size="small"
                    plain
                    :data-testid="`edit-dish-${row.id}`"
                    @click="openEdit(row)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    size="small"
                    plain
                    :loading="actingId === row.id"
                    :data-testid="`toggle-dish-${row.id}`"
                    @click="toggleStatus(row)"
                  >
                    {{ row.listed === false ? '上架' : '下架' }}
                  </el-button>
                  <el-button
                    size="small"
                    plain
                    class="admin-delete-btn"
                    :loading="actingId === row.id"
                    :data-testid="`delete-dish-${row.id}`"
                    @click="removeDish(row)"
                  >
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <DishFormDialog
          v-model="dialogOpen"
          :editing="editing"
          :initial-dish="editingDish"
          :saving="saving"
          :error-message="dialogError"
          @submit="handleDialogSubmit"
        >
          <template #hint>
            <p class="admin-dialog-hint">
              本次提交由服务端校验档口归属，仅作用于「{{ ownStall?.name || stallId }}」。
            </p>
          </template>
        </DishFormDialog>
      </div>
    </main>

    <footer class="dish-footer">
      <span>食光校园 · 档口工作台</span>
      <span>下架后，学生菜单将隐藏该菜品。</span>
    </footer>
  </div>
</template>

<style scoped>
.admin-page {
  max-width: 1180px;
  margin: 0 auto;
  padding-bottom: var(--space-8);
}
.admin-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.admin-breadcrumb {
  margin: 0 0 var(--space-2);
  font-size: var(--fs-12);
  color: var(--muted);
}
.admin-hero h1 {
  margin: 0 0 var(--space-2);
  font-size: clamp(24px, 2.2vw, 31px);
  color: var(--forest);
  font-weight: var(--fw-semibold);
  line-height: 1.3;
}
.admin-subtitle {
  margin: 0;
  font-size: var(--fs-13);
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
.admin-subtitle strong {
  color: var(--ink);
}
.admin-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.admin-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.admin-metric-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  padding: var(--space-4) var(--space-5);
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}
.admin-metric-card span {
  font-size: var(--fs-13);
  color: var(--muted);
}
.admin-metric-card strong {
  font-size: var(--fs-24);
  color: var(--forest);
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
}
.admin-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.admin-search {
  width: 260px;
  max-width: 100%;
}
.admin-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.admin-chip {
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  font-size: var(--fs-12);
  font-weight: var(--fw-medium);
}
.admin-chip:hover {
  border-color: var(--brand-300);
  background: var(--brand-50);
}
.admin-chip.is-active {
  background: var(--forest);
  border-color: var(--forest);
  color: var(--white);
}
.admin-count {
  margin-left: auto;
  font-size: var(--fs-12);
  color: var(--muted);
}
.admin-error {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--danger-100);
  color: var(--danger-600);
  border-radius: var(--radius-lg);
  font-size: var(--fs-13);
}
.admin-error .el-button {
  margin-left: auto;
}
.admin-table-wrap {
  width: 100%;
  overflow-x: auto;
}
.admin-table {
  min-width: 880px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--line);
  box-shadow: var(--shadow-2);
}
.table-dish {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.table-dish img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.table-dish div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.table-dish__link {
  font-size: var(--fs-14);
  font-weight: var(--fw-semibold);
  color: var(--ink);
}
.table-dish__link:hover {
  color: var(--forest);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.table-dish span {
  font-size: var(--fs-11);
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.admin-row-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.admin-delete-btn {
  color: var(--danger-600);
  border-color: var(--danger-line);
}
.admin-delete-btn:hover {
  background: var(--danger-100);
  border-color: var(--danger-600);
}
.admin-dialog-hint {
  margin: 0 0 var(--space-4);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--brand-50);
  border: 1px solid var(--brand-200);
  color: var(--forest);
  font-size: var(--fs-12);
}
@media (max-width: 780px) {
  .admin-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .admin-search {
    width: 100%;
  }
}
</style>
