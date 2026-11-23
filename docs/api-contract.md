# 食堂点餐系统接口契约

维护负责人：陈续文（32605150601，数据模型、json-server 服务入口、统一网络层、接口契约与异常规范）。账户领域接口与会话模块负责人：王鸿。本文是前端页面、接口实现和答辩验收的共同依据；字段、枚举、状态流转和错误码发生变更时，先改本文，再改代码与用例。

## 1. 运行方式与请求约定

- 本地接口：`node server/index.cjs`，默认 `http://127.0.0.1:3001`，端口可用 `API_PORT` 覆盖。
- 前端开发：Vite 将 `/api` 代理到 `http://127.0.0.1:3001` 并去掉 `/api` 前缀；页面只使用 `src/api/http.js` 的实例，不硬编码域名。
- 请求头：除 `/health`、`/auth/login` 外必须带 `Authorization: Bearer <token>`；JSON 请求带 `Content-Type: application/json`。
- 响应：成功直接返回资源对象或数组；失败统一为 `{ message, code, fields? }`，`fields` 是出错字段名数组，便于表单定位。
- 业务响应带 `Cache-Control: no-store`，避免浏览器缓存个人订单或菜品写结果。
- 金额单位为人民币元，服务端保留两位小数；前端展示统一两位小数，不在页面用浮点金额直接累加。
- 种子数据在 `db.json`；运行时数据在忽略提交的 `.local/db.runtime.json`。接口测试使用独立临时库，不修改种子或同学的本地数据。

## 2. 身份与权限

| 角色 | 说明 | 数据范围 |
| --- | --- | --- |
| `student` | 学生 | 可读菜品/档口；只能创建订单、查看和确认自己的订单 |
| `merchant` | 档口商家，必须绑定 `stallId` | 可读全部目录；只能维护本档口菜品、推进本档口订单 |

`user.id` 是业务外键（如 `student-1`），`userId`、`stallId` 必须使用该 id，不能混用学号、昵称或档口名称。原始用户库 `/users`、`/db` 一律 403；用户资料只通过 `/me` 系列接口读写，响应不会包含 `password`、`passwordHash`、`salt` 等字段。

会话：普通登录 1 小时，勾选“保持登录”7 天；服务端重启会清空内存会话。401 时前端统一派发 `shiguang:unauthorized` 事件，由路由守卫回到登录页；登录接口自身失败不派发，避免循环跳转。

## 3. 数据字典

### 3.1 stall（档口，只读）

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | string | 唯一，如 `stall-1` |
| `name` | string | 唯一，1–40 字 |
| `canteen` | string | 食堂枚举，`第一食堂`、`第二食堂`、`风味食堂` |
| `desc` | string | 档口简介，≤120 字 |
| `window` | string | 取餐窗口，如 `A 窗口`；下单时拼成 `青禾小厨 · A 窗口` |

### 3.2 dish（菜品）

| 字段 | 类型 | 约束 / 说明 |
| --- | --- | --- |
| `id` | string | `dish-NN`，服务端生成，客户端不可改 |
| `name` | string | 必填，1–40 字，去首尾空格，禁止控制字符 |
| `price` | number | 必填，0.01–999，最多两位小数 |
| `originalPrice` | number | 可选，0.01–999，且不得低于 `price` |
| `image` | string | `/images/...` 本地路径或 `http(s)://` 地址 |
| `desc` | string | ≤120 字，禁止控制字符 |
| `stall` | string | 档口名称，服务端按 `stallId` 回填，客户端不可改 |
| `stallId` | string | 必须引用存在的档口；商家只能写自己档口 |
| `category` | string | `家常小炒` / `面食米线` / `轻食蔬菜` / `风味套餐` |
| `meal` | string | `breakfast` / `lunch` / `dinner` / `night` |
| `status` | string | `success` 正常 / `warning` 紧张 / `danger` 售罄 |
| `badges` | string[] | ≤3 项，每项 1–8 字，自动去重 |
| `spice` | number | `0`–`3` 的整数 |
| `tags` | `{text,type}[]` | ≤3 项；`type` 为 `veg` / `halal` / `spicy` |
| `rating` | number | 0–5，服务端托管，客户端不可改 |
| `sales` | number | 非负整数，服务端托管，客户端不可改 |

`listed` 单独记录上下架，缺省值为 `true`。`status` 描述在售库存状态，`danger` 表示售罄。旧菜品的 `soldOut: true` 和 `available: false` 继续受到服务端约束。

### 3.3 order（订单）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | `SG` + 日期 + 4 位十六进制，如 `SG261120A1B2`，服务端生成 |
| `userId` | string | 下单学生 id，服务端从会话写入，客户端不可指定 |
| `userName` | string | 下单人显示名，服务端写入 |
| `stallId` / `stallName` | string | 服务端按菜品档口写入；一单只能一个档口 |
| `items` | OrderItem[] | 至少 1 项、最多 50 项 |
| `total` | number | 服务端按 `dish.price × qty` 重新计算，忽略客户端传值 |
| `remark` | string | ≤100 字，可空，禁止控制字符 |
| `meal` | string | 同菜品枚举，默认 `lunch` |
| `status` | string | 见状态机 |
| `pickupCode` | string | 4 位数字，在 `pending/preparing/ready` 中唯一 |
| `window` | string | `档口名 · 窗口`，如 `青禾小厨 · A 窗口` |
| `eta` | string | 预计取餐提示，如 `约 15 分钟` |
| `createdAt` / `updatedAt` | string | ISO 8601 UTC 时间 |

### 3.4 OrderItem

```json
{ "dishId": "dish-01", "name": "招牌红烧肉饭", "image": "/images/dish-01.webp", "price": 18, "qty": 2 }
```

客户端提交明细只允许 `{ dishId, qty }`；`name`、`image`、`price` 由服务端按当前菜品回填，防止篡改价格。`qty` 为 1–20 的整数；同一 `dishId` 在一单中不能重复出现。

## 4. 接口清单

### 4.1 公共与账户

| 接口 | 方法 | 输入 / 返回 | 权限与行为 |
| --- | --- | --- | --- |
| `/health` | GET | `{ status:"ok", service:"shiguang-campus-api" }` | 无需登录 |
| `/auth/login` | POST | `{ account, password, role, remember }` → `{ user, token, expiresAt }` | 账号、密码、身份必须一致；失败 401 `INVALID_CREDENTIALS` |
| `/auth/session` | GET | `{ user, expiresAt }` | 核验会话；失效 401 `SESSION_EXPIRED` |
| `/auth/session` | DELETE | 204 | 撤销当前会话 |
| `/auth/sessions` | DELETE | 204 | 撤销本人全部设备会话 |
| `/me` | GET | 脱敏用户对象 | 只能本人 |
| `/me/summary` | GET | `{ totalOrders, pendingOrders, readyOrders, completedOrders, recentOrders }` | 学生按本人统计，商家按所属档口统计。`pendingOrders` 为待支付，`readyOrders` 为待取餐 |
| `/me/profile` | PUT | `{ displayName, phone, email, canteen, avatarTone }` | 白名单；禁止改 `account/id/role` |
| `/me/preferences` | PUT | `{ spice, cuisines, avoidIngredients, mealTime }` | 枚举白名单 |
| `/me/password` | PUT | `{ currentPassword, newPassword }` | 校验旧密码；撤销全部旧会话 |
| `/users`、`/users/:id`、`/db` | 任意 | 403 `FORBIDDEN` | 不暴露原始用户库 |

### 4.2 档口（只读）

| 接口 | 方法 | 行为 |
| --- | --- | --- |
| `/stalls` | GET | 返回全部档口，含 `window`，供下单拼取餐窗口 |
| `/stalls/:id` | GET | 单个档口；不存在 404 `NOT_FOUND` |
| `/stalls`、`/stalls/:id` | POST/PUT/PATCH/DELETE | 403 `FORBIDDEN`，档口资料由管理员维护 |

### 4.3 菜品

| 接口 | 方法 | 权限 | 行为 |
| --- | --- | --- | --- |
| `/dishes` | GET | 登录 | 列表；支持 `stallId` / `stall` / `meal` / `category` / `status` / `q` 过滤 |
| `/dishes/:id` | GET | 登录 | 详情；不存在 404 |
| `/dishes` | POST | 商家 | 新增本档口菜品；201 返回完整对象 |
| `/dishes/:id` | PUT/PATCH | 商家 | 部分更新本档口菜品；只写白名单字段 |
| `/dishes/:id` | DELETE | 商家 | 删除本档口菜品；204；不存在 404 |

**菜品写白名单**：`name`、`price`、`originalPrice`、`image`、`desc`、`category`、`meal`、`status`、`badges`、`spice`、`tags`。未知字段一律 422 `INVALID_FIELDS` 并回传 `fields`。

**服务端托管字段**：`id`、`stall`、`stallId`、`rating`、`sales`。客户端可以随完整对象提交这些字段，但服务端不会按提交值写入；修改 `id` 会 422，试图把菜品移到其他档口会 403。新增时服务端生成 `dish-NN`、`rating: 0`、`sales: 0`，并根据商家账号绑定档口回填 `stall` / `stallId`。

**筛选参数**：`meal`、`category`、`status` 只接受枚举值，非法值 422 `INVALID_QUERY`；`q` 对菜名、描述、档口名、分类做不区分大小写的包含匹配；`stallId`、`stall` 精确匹配。

### 4.4 订单

| 接口 | 方法 | 权限 | 行为 |
| --- | --- | --- | --- |
| `/orders` | POST | 学生 | 创建订单；201 返回服务端核价后的完整订单 |
| `/orders` | GET | 登录 | 学生只见本人；商家见全部；支持 `status` / `meal` 过滤；按 `createdAt` 倒序 |
| `/orders/:id` | GET | 登录 | 学生查他人订单返回 404（不泄露存在性）；商家可查全部 |
| `/orders/:id` | PUT/PATCH | 登录 | 推进/确认状态，见状态机 |
| `/orders` | DELETE | 任意 | 405 `METHOD_NOT_ALLOWED`，订单不物理删除 |

**创建订单请求体**：

```json
{
  "items": [
    { "dishId": "dish-01", "qty": 2 },
    { "dishId": "dish-05", "qty": 1 }
  ],
  "meal": "lunch",
  "remark": "少辣，米饭多一点"
}
```

顶层只允许 `items`、`remark`、`meal`、`total`、`stallId`。`total` 和 `stallId` 为兼容旧页面/防篡改脚本而接受，但会被忽略：总价必须由服务端按菜品现价重算，档口由菜品反查。其他未知字段 422 `INVALID_FIELDS`。

创建时依次校验：请求体是对象 → 顶层字段白名单 → `items` 非空且 ≤50 项 → `meal` 枚举 → `remark` 长度/控制字符 → 每项只含 `dishId`/`qty` → `qty` 1–20 → 菜品存在 → 未售罄 → 同一档口 → 服务端核价。任一失败不落库。

创建成功固定：`status: "preparing"`、`pickupCode` 4 位、`window` 由档口 `name · window` 拼接、`eta: "约 15 分钟"`、`createdAt/updatedAt` 为当前时间。演示流程在提交订单时视为已完成支付，因此不产生 `pending` 新单；`pending` 仍作为合法历史状态保留。

### 4.5 订单状态机

```text
pending（待支付/待处理）
   │ 商家 next
   ▼
preparing（备餐中） ──商家 next──▶ ready（待取餐） ──学生 confirm──▶ completed（已完成）
   │                                  │
   └──── 商家 refunded（仅 pending/preparing）────▶ refunded（已退款）
```

| 操作者 | 请求 | 允许的前置状态 | 结果 |
| --- | --- | --- | --- |
| 商家 | `{ "action": "next" }` | `pending` / `preparing` / `ready` | 推进到下一状态；`completed` 再 next 返回 422 |
| 商家 | `{ "status": "next 目标" }` | 同上 | 只允许前进一步，不能跳级 |
| 商家 | `{ "status": "refunded" }` | `pending` / `preparing` | 退款；`ready/completed` 拒绝 |
| 商家 | `{ "action": "confirm" }` | 任意 | 422，确认取餐只能由学生操作 |
| 学生 | `{ "action": "confirm" }` | 本人订单且 `ready` | `completed` |
| 学生 | 其他写操作 | 任意 | 403（非本人或不允许的状态变更） |

服务端校验角色、本人/本档口范围：商家只能推进 `order.stallId === user.stallId` 的订单；早期没有 `stallId` 的订单按明细菜品反查唯一档口。学生只能操作 `order.userId === user.id` 的订单，且只能做 `ready → completed` 的确认。

请求体只允许 `action` 或 `status` 二者之一；`action` 仅 `next` / `confirm`；`status` 必须是订单状态枚举；同时提交或非法值 422 `INVALID_STATUS`。未知字段 422 `INVALID_FIELDS`。

## 5. 错误码

| HTTP | `code` | 含义 |
| --- | --- | --- |
| 400 | `INVALID_JSON` | 请求体不是合法 JSON |
| 400 | `INVALID_LOGIN` | 登录参数缺失或身份非法 |
| 401 | `SESSION_EXPIRED` | 未带 token、token 无效或会话过期 |
| 401 | `INVALID_CREDENTIALS` | 账号、密码或登录身份不匹配 |
| 403 | `FORBIDDEN` | 角色越权、非本档口、非本人、原始用户库 |
| 404 | `NOT_FOUND` | 资源/接口不存在；学生查他人订单也返回此码 |
| 405 | `METHOD_NOT_ALLOWED` | 资源不支持该 HTTP 方法 |
| 413 | `PAYLOAD_TOO_LARGE` | 请求体超过限制 |
| 422 | `INVALID_FIELDS` | 未知字段或字段值不合法，`fields` 给出字段名 |
| 422 | `INVALID_QUERY` | 查询参数枚举非法 |
| 422 | `INVALID_ITEMS` | 订单明细为空、重复、数量越界、菜品不存在或夹带字段 |
| 422 | `DISH_SOLD_OUT` | 菜品已售罄/下架 |
| 422 | `MIXED_STALLS` | 一单包含多个档口的菜品 |
| 422 | `INVALID_ORDER` | 请求体不是 JSON 对象 |
| 422 | `INVALID_MEAL` / `INVALID_REMARK` | 餐次/备注不合法 |
| 422 | `INVALID_STATUS` | 订单状态或 action 不合法、不允许的状态变更 |
| 500 | `INTERNAL_ERROR` | 未预期异常；服务端记录日志，不把堆栈返回前端 |

## 6. 统一网络层与 loading / catch 规范（C4）

### 6.1 `src/api/http.js`

- 唯一 Axios 实例：`baseURL` 取 `VITE_API_BASE_URL`，默认 `/api`；`timeout` 取 `VITE_API_TIMEOUT`，默认 10000ms，限制在 1000–60000ms。
- 请求拦截自动加 `Authorization: Bearer <token>`（`/auth/login` 除外），并维护全局 `requestState.pending`；成功或失败都减一，保证不发请求时归零。
- 响应失败时把归一化结果写入 `error.normalized` 和 `requestState.lastError`；401 且非登录接口派发 `shiguang:unauthorized`。
- 导出 `pendingCount`、`isRequesting`、`resetRequestState`，供顶栏/调试面板显示跨页面请求状态；页面自己的 `loading` 仍负责局部骨架屏和按钮禁用。
- 领域 API（`api/auth.js`、`api/account.js`、`api/dishes.js`、`api/orders.js`）只返回 `response.data`，不重复创建实例。

### 6.2 `src/api/errors.js`

`normalizeError(error, fallback)` 返回：

```js
{ kind, status, code, message, requestId? }
```

`kind` 取值：`canceled` / `timeout` / `network` / `auth` / `forbidden` / `not-found` / `conflict` / `validation` / `payload-too-large` / `rate-limit` / `server` / `client` / `unknown`。

判断顺序：取消 → 超时 → 无响应（断网）→ 有响应按状态码。这样 `ECONNABORTED` 不会被误报为“网络断开”，主动取消也不会弹错误提示。

`requestMessage(error, fallback)` 只返回可展示文案，页面继续从 `@/api/http` 导入即可；需要分支处理时使用 `isTimeout`、`isNetworkError`、`isAuthError`、`isForbiddenError`、`isNotFoundError`、`isValidationError`。

### 6.3 页面请求模板

```js
export default {
  data: () => ({ loading: false, errorText: '', dishes: [] }),
  methods: {
    async load() {
      this.loading = true
      this.errorText = ''
      try {
        this.dishes = await dishesApi.list()
      } catch (error) {
        this.errorText = requestMessage(error, '菜单加载失败，请稍后重试。')
      } finally {
        this.loading = false
      }
    },
  },
}
```

约定：

1. 每个请求必须有 `catch`，不能吞掉错误返回成功；错误文案优先用服务端 `message`，没有时用本模块兜底。
2. 列表/详情用 `loading` 控制骨架屏或空态；提交按钮用独立 `submitting`，请求中禁用，防止重复下单/重复保存。
3. 请求失败保留上一次成功数据或明确空态，不能把旧数据伪装成新结果。
4. 写操作成功后重新 `GET` 回读，不只手改本地数组；后端是唯一事实来源。
5. 401 交给全局事件；403/404/422 在表单或页面内展示；超时/断网提示检查网络，允许重试。
6. 页面不直接读 `localStorage` 拼 token，不直接访问 `/users`、`/db`。

## 7. 与分工文档的对应

- 分工文档要求“3001 端口、所有业务数据来自接口、字段/枚举/响应一致、超时/401/403/404/网络断开可识别、不暴露密码散列、只接受白名单字段”，分别由 `server/index.cjs`、`server/db.cjs`、`db.json`、`src/api/http.js`、`src/api/errors.js` 和 `tests/api/*` 覆盖。
- 菜品状态采用 `status` 而非新增 `available` 的理由见 3.2；服务端同时兼容 `available: false` 与 `soldOut: true`，页面无需双写。
- 分工文档的 `pending → completed` 目标仍成立：`pending` 是合法起点，`completed` 是终态；为了让现有订单页能显示“待支付 → 备餐中 → 待取餐 → 已完成”，实现中增加了 `preparing` / `ready` 两个中间态，服务端按状态机逐级推进，不允许跳级。
- 菜单、购物车、下单页、订单页的展示与交互由李岷鳌/翟毅等页面负责人维护；本契约只约定数据、接口和请求状态，不修改他们的页面文件。

## 8. 验收与测试

```bash
cd web
npm.cmd test                 # 单元 + 接口，验收数量见 docs/final-review.md
node server/index.cjs        # 3001 端口
```

- `tests/unit/http-errors.test.js`：超时/取消/断网、401/403/404/422/500、业务文案优先与回退。
- `tests/api/data-api.test.js`：目录读取、商家本档口 CRUD、未知字段、跨档口 403、学生写 403、档口只读、下单核价/取餐码/窗口、重复明细/超量/夹带字段、售罄、跨档口订单、可见性隔离、状态流转、非法 JSON、404/403/405、筛选枚举。
- `tests/api/helpers/api-harness.mjs`：每个测试文件独立临时库与凭据，随机端口启动，不污染 `db.json` 和 `.local` 使用记录。
- `server/db.cjs` 在每次启动时深校验 `db.json`：唯一 id、枚举、金额、引用、密码散列字段、订单明细等；种子损坏会直接拒绝启动，避免带病演示。

## 终版字段与接口

| 入口 | 读写约定 |
| --- | --- |
| `GET /dishes`、`GET /dishes/:id` | 学生仅见上架菜。读回的 `reviewCount` 为实际评价数，非零时 `rating` 为买家平均星级，零时旧评分显示为参考。 |
| `PUT /dishes/:id` | 本档口可更新 `listed`。下架与售罄独立，旧记录缺省为上架。管理列表使用 `GET /dishes?manage=1&stallId=…` 取回本档口下架菜。`originalPrice: null` 清除划线价。 |
| `POST /orders` | 一个档口生成一笔订单。桌面与移动端都按选择的分组提交；含下架菜返回 422 `DISH_UNLISTED`。成功后仅扣该组已提交数量。 |
| `GET /orders` | 列表按创建时间降序。商家列表额外给出布尔字段 `ownStall`，写权限由服务端独立校验。 |
| `PUT /orders/:id/ratings/:dishId` | 本人的已完成订单内可提交 `{"stars": 1..5}`，成功返回订单及 `ratings`。重复保存会更新同一评分。未完成 409，星级非法 422，订单或明细不属于本人 404。 |

结算时客户端以 `Idempotency-Key` 发送 32 位小写十六进制标识。第一次下单返回 201；同一学生同一请求重试返回 200 和原订单，复用标识提交不同内容返回 409。回执与订单在同一次数据库写入中保存。
