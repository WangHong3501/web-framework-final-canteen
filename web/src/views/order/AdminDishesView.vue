<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElTable, ElTableColumn, ElInputNumber } from 'element-plus'
import 'element-plus/theme-chalk/el-table.css'
import 'element-plus/theme-chalk/el-input-number.css'
// el-table / el-table-column / el-input-number 未全局注册，页面内按需引入
void ElTable; void ElTableColumn; void ElInputNumber
import { catalogApi } from '@/api/catalog'
import { requestMessage } from '@/api/http'
import { useUserStore } from '@/stores/user'
import AppIcon from '@/components/ui/AppIcon.vue'
import StatusTag from '@/components/ui/StatusTag.vue'
import PriceTag from '@/components/ui/PriceTag.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const user = useUserStore()
const dishes = ref([])
const loading = ref(true)
const errorMsg = ref('')
const keyword = ref('')
const dialogOpen = ref(false)
const editing = ref(false)
const saving = ref(false)
const form = ref({ id: '', name: '', price: 0, category: '家常小炒', status: 'success', desc: '' })

const CATEGORIES = ['家常小炒', '面食米线', '轻食蔬菜', '风味套餐']
const STATUS = [
  { key: 'success', label: '可点餐' },
  { key: 'warning', label: '余量少' },
  { key: 'danger', label: '已售罄' },
]

// 商家只看自己档口的菜品
const visibleDishes = computed(() => {
  const own = dishes.value.filter((d) => d.stallId === user.user?.stallId)
  const kw = keyword.value.trim().toLowerCase()
  return kw ? own.filter((d) => d.name.toLowerCase().includes(kw)) : own
})

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    dishes.value = await catalogApi.dishes()
  } catch (error) {
    errorMsg.value = requestMessage(error, '菜品加载失败。')
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editing.value = false
  form.value = { id: '', name: '', price: 0, category: '家常小炒', status: 'success', desc: '' }
  dialogOpen.value = true
}

function openEdit(dish) {
  editing.value = true
  form.value = {
    id: dish.id,
    name: dish.name,
    price: Number(dish.price),
    category: dish.category,
    status: dish.status,
    desc: dish.desc || '',
  }
  dialogOpen.value = true
}

async function save() {
  if (!form.value.name || Number(form.value.price) <= 0) {
    ElMessage.warning('请填写菜名与有效价格')
    return
  }
  saving.value = true
  try {
    // TODO: 接入菜品写接口后替换；当前演示以本地态更新并提示。
    const existing = dishes.value.find((d) => d.id === form.value.id)
    if (existing) {
      Object.assign(existing, {
        name: form.value.name,
        price: Number(form.value.price),
        category: form.value.category,
        status: form.value.status,
        desc: form.value.desc,
      })
    } else {
      dishes.value.push({
        id: `dish-${Date.now()}`,
        name: form.value.name,
        price: Number(form.value.price),
        category: form.value.category,
        status: form.value.status,
        desc: form.value.desc,
        stall: user.user?.displayName || '青禾小厨',
        stallId: user.user?.stallId,
        badges: [],
        spice: 0,
        tags: [],
        image: '/images/fresh-bowl.jpg',
        meal: 'lunch',
      })
    }
    dialogOpen.value = false
    ElMessage.success(editing.value ? '菜品已更新' : '菜品已新增')
  } finally {
    saving.value = false
  }
}

async function toggleStatus(dish) {
  const next = dish.status === 'danger' ? 'success' : 'danger'
  const label = next === 'danger' ? '下架（售罄）' : '上架（可点餐）'
  try {
    await ElMessageBox.confirm(`确定将该菜品设为「${label}」吗？`, '调整售卖状态', { type: 'info' })
  } catch {
    return
  }
  dish.status = next
  ElMessage.success(`已设为${label}`)
}

function statusText(key) {
  return STATUS.find((s) => s.key === key)?.label || key
}

onMounted(load)
</script>

<template>
  <div class="admin-page">
    <div class="order-section-head">
      <div>
        <h2>档口工作台</h2>
        <p>{{ user.user?.displayName }} · 管理本档口菜品的上下架与信息</p>
      </div>
      <el-button type="primary" @click="openAdd">
        <AppIcon name="Plus" :size="16" /> 新增菜品
      </el-button>
    </div>

    <div class="admin-toolbar">
      <el-input v-model="keyword" placeholder="搜索本档口菜品" clearable class="admin-search">
        <template #prefix><AppIcon name="Search" :size="16" /></template>
      </el-input>
      <span class="admin-count">共 {{ visibleDishes.length }} 道菜</span>
    </div>

    <div v-if="errorMsg" class="admin-error" role="alert">
      <AppIcon name="CircleAlert" :size="18" /> {{ errorMsg }}
      <el-button size="small" @click="load">重试</el-button>
    </div>

    <EmptyState
      v-else-if="!loading && !visibleDishes.length"
      title="还没有菜品"
      detail="点击右上角新增菜品，丰富你的档口菜单。"
      action-label="新增菜品"
      icon="Store"
      @action="openAdd"
    />

    <el-table v-else v-loading="loading" :data="visibleDishes" class="admin-table" stripe empty-text="暂无菜品">
      <el-table-column label="菜品" min-width="220">
        <template #default="{ row }">
          <div class="table-dish">
            <img :src="row.image" :alt="row.name" />
            <div>
              <strong>{{ row.name }}</strong>
              <span>{{ row.desc }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="120">
        <template #default="{ row }">{{ row.category }}</template>
      </el-table-column>
      <el-table-column label="价格" width="120">
        <template #default="{ row }"><PriceTag :value="row.price" size="sm" /></template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <StatusTag :type="row.status" :text="statusText(row.status)" dot />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" text @click="openEdit(row)">编辑</el-button>
          <el-button size="small" text type="primary" @click="toggleStatus(row)">
            {{ row.status === 'danger' ? '上架' : '下架' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogOpen" :title="editing ? '编辑菜品' : '新增菜品'" width="480px">
      <el-form :model="form" label-position="top">
        <el-form-item label="菜品名称">
          <el-input v-model="form.name" maxlength="20" placeholder="例如：招牌红烧肉饭" />
        </el-form-item>
        <el-form-item label="价格（元）">
          <el-input-number v-model="form.price" :min="0.5" :max="999" :precision="2" :step="1" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category">
            <el-option v-for="c in CATEGORIES" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="售卖状态">
          <el-radio-group v-model="form.status">
            <el-radio-button v-for="s in STATUS" :key="s.key" :value="s.key">{{ s.label }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜品简介">
          <el-input v-model="form.desc" type="textarea" :rows="2" maxlength="60" placeholder="一句话描述这道菜" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-page {
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: var(--space-8);
}
.admin-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.admin-search {
  width: 300px;
  max-width: 100%;
}
.admin-count {
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
.admin-error span,
.admin-error .el-button {
  margin-left: auto;
}
.admin-table {
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
/* 局部修正：主按钮在深绿底上需白色文字（不改全局覆盖层，避免影响其他页面） */
.admin-page :deep(.el-button--primary:not(.is-plain):not(.is-text)) {
  --el-button-text-color: var(--white);
  --el-button-hover-text-color: var(--white);
}
.table-dish img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}
.table-dish div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.table-dish strong {
  font-size: var(--fs-13);
  color: var(--ink);
}
.table-dish span {
  font-size: var(--fs-11);
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
