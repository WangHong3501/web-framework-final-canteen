# 页面开发 B 设计与技术说明

负责人：翟毅（32605150604）。对应选题为 G5「食堂线上点餐系统」，基于仓库基线 [7aa7bfd](https://github.com/WangHong3501/web-framework-final-canteen/commit/7aa7bfd)（含陈续文完成的数据模型与接口、江贤松统一的视觉令牌与点餐车仓库）实现并重构页面开发 B 负责的三个页面、读写接口封装及可复用业务组件，严格遵循 **Vue 3 选项式 API**（`export default`）与文件唯一所有权约定。

## 一、功能范围与优先级对应

| 对应需求 | 页面 / 路由 | 角色权限 | 落地内容 |
| --- | --- | --- | --- |
| 必做 F2 + 期望 E7 | `/menu`（`web/src/views/order/MenuView.vue`） | 已登录学生、商家 | 档口 Tab 切换、餐次切换、分类筛选、关键词搜索、售罄联动禁用、空态重置及接入真实 `useCartStore` 点餐车 |
| 必做 F2（动态详情） | `/dish/:id`（`web/src/views/order/DishDetailView.vue`） | 已登录学生、商家 | `:id` 动态参数格式校验、详情与档口窗口信息展示、整数分小计、份数选择加车、同档口推荐联动与 404/非法参数兜底 |
| 期望 E6（菜品管理） | `/admin/dishes`（`web/src/views/order/AdminDishesView.vue`） | 仅限 `merchant` | 绑定商家所属 `stallId`、四项状态统计、Element Plus `el-table` 展示、弹窗表单新增/编辑、确认上下架与删除；每次写操作后重新 GET 回读列表 |

## 二、路由与权限衔接

直接复用 `web/src/router/index.js` 与 `web/src/router/policy.js` 中已建立的路由配置、懒加载 `() => import(...)`、全局登录守卫与商家角色守卫（`meta: { requiresAuth: true, roles: ['merchant'] }`）：

- `/menu` 与 `/dish/:id`：受全局登录守卫保护，URL 查询参数（`meal`、`stall`、`category`、`q`）双向同步，刷新后可还原筛选状态；`/dish/:id` 先经 `isValidDishId`（`/^[A-Za-z0-9_-]{1,64}$/`）过滤非法编号，不向接口发送无效请求。
- `/admin/dishes`：学生访问由守卫直接跳转 `/forbidden`；页面保留主标题「欢迎来到档口工作台」与「回到个人中心」返回按钮，与既有权限验收用例保持一致。

## 三、选项式 API 与组件化设计

菜品通用组件全部封装于 `web/src/components/dishes/`，与共享公共组件 `web/src/components/ui/` 组合复用：

```text
MenuView / DishDetailView / AdminDishesView（均采用选项式 API）
├── DishTopBar（props: active, skipTarget；slot: #actions；联动 useUserStore / useCartStore）
├── DishStallTabs（props: stalls, modelValue, totalCount, filteredCount；emits: update:modelValue, reset；slot: #extra）
├── DishFormDialog（props: modelValue, editing, initialDish, saving, errorMessage；emits: update:modelValue, submit；slot: #hint）
└── DishRelatedGrid（props: dishes, stallName；emits: select；slot: #aside）
```

### `computed` 与 `watch` 的业务用途

1. **`computed`**：
   - `MenuView.vue`：`categories`（随当前餐次和档口动态收敛可用分类）、`filteredDishes`（四维筛选结果）、`availableCount`、`filterQuery`（生成 URL 查询对象）、`hasActiveFilter`。
   - `DishDetailView.vue`：`validId`（动态路由参数格式校验）、`soldOut`（兼容 `status === 'danger'` / `soldOut` / `available === false`）、`subtotalText`（调用 `toCents` 与 `formatYuanFromCents` 计算整数分小计）、`relatedDishes`（筛选同档口推荐菜品）、`canManageDish`。
   - `AdminDishesView.vue`：`ownDishes`（按 `userStore.user.stallId` 隔离本档口菜品）、`visibleDishes`、`successCount` / `warningCount` / `dangerCount`、`ownStallLabel`。
2. **`watch`**：
   - `MenuView.vue`：监听 `meal` 同步更新 `cartStore.setMeal(meal)`（`meal !== 'all'` 时确保下单餐次合法）；监听 `categories` 自动纠正失效分类；监听 `filterQuery` 与 `$route.query` 双向同步筛选状态。
   - `DishDetailView.vue`：监听 `'$route.params.id'`，在点击「同档口其他餐品」切换 `:id` 时自动重置份数并重新请求详情。
   - `DishFormDialog.vue`：监听 `modelValue` 与 `initialDish`，在弹窗打开时同步/清空表单字段并重置校验状态。

## 四、接口封装与数据契约对齐

- 新建 `web/src/api/dishes.js`，统一导入 `web/src/api/http.js`（复用超时、自动附加 `Authorization: Bearer <token>` 与 401 统一事件），覆盖 `GET /stalls`、`GET /dishes`、`GET /dishes/:id`、`POST /dishes`、`PUT /dishes/:id`、`DELETE /dishes/:id`。
- 通过 `web/src/components/dishes/dish-meta.js` 中的 `buildDishPayload` 严格按后端写白名单（`name`、`price`、可选 `originalPrice`、`image`、`desc`、`category`、`meal`、`status`、`badges`、`spice`）构造请求体，不夹带未知字段或非法空原价；图片路径通过 `resolveDishImage(src, import.meta.env.BASE_URL)` 拼接，适配 `base: './'` 相对路径构建。
- `AdminDishesView.vue` 在每次 `POST`、`PUT` 或 `DELETE` 成功后均执行 `await this.load()` 重新向服务端 `GET` 拉取最新列表，所有请求通过 `catch` 调用 `requestMessage` 展示可读错误。
