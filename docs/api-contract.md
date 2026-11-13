# 账户模块接口约定

维护负责人：陈续文（公共请求/数据契约）；账户领域接口与会话模块负责人：王鸿。接口来源为本地 json-server 及其身份中间件，端口 3001；前端通过 `/api` 代理访问，不在页面硬编码域名。生产部署时由接口与部署负责人协商配置真实 API 服务。

## 请求与身份

登录成功返回随机会话 token，后续请求以 `Authorization: Bearer <token>` 传递。客户端只持久化脱敏资料、token、有效期和保持登录选项；服务端再次验证会话、身份与权限。演示密码只用于课程本地账号，不接入真实校园认证或支付。

普通登录会话 1 小时，勾选“保持登录”为 7 天；服务端重启会清除内存会话，浏览器应重新登录。资料及密码散列保存在忽略提交的 `.local/` 运行数据中，种子 `db.json` 不因个人操作而改写。

| 接口 | 方法 | 输入 / 返回 | 权限与行为 |
| --- | --- | --- | --- |
| `/health` | GET | `{ status: "ok" }` | 无需登录，供启动检查 |
| `/auth/login` | POST | `{ account, password, role, remember }` → `{ user, token, expiresAt }` | 账号、密码和身份必须一致；失败 401，无会话 |
| `/auth/session` | GET | `{ user, expiresAt }` | 核验会话；失效 401 |
| `/auth/session` | DELETE | 204 | 撤销当前会话 |
| `/auth/sessions` | DELETE | 204 | 撤销本人的全部设备会话 |
| `/me` | GET | 脱敏用户对象 | 只能获取本人 |
| `/me/summary` | GET | `{ totalOrders, pendingOrders, completedOrders, recentOrders }` | 按本人 userId 过滤，不能伪造其他人摘要 |
| `/me/profile` | PUT | `{ displayName, phone, email, canteen, avatarTone }` | 白名单校验，禁止修改 account/id/role；成功后前端重新 GET `/me` |
| `/me/preferences` | PUT | `{ spice, cuisines, avoidIngredients, mealTime }` | 白名单枚举，成功后重新 GET `/me` |
| `/me/password` | PUT | `{ currentPassword, newPassword }` | 当前密码正确；新密码 8–72 位字母数字组合；撤销全部旧会话，重新登录 |
| `/users`、`/users/:id`、`/db` | 任意 | 403 | 不暴露原始用户库，统一使用 `/me` |
| `/orders`、`/orders/:id` | GET | 本人订单数组或对象 | 目前只读接入摘要，其他人的订单不可读取 |
| `/orders` | 写操作 | 503 `MODULE_NOT_READY` | 订单完整流程由李岷鳌与陈续文接入后开放，当前不伪装支持下单 |

失败统一为 `{ message, code }`。401 表示会话无效；403 表示身份无权限；404 表示目标不存在；422 表示字段/密码校验未通过；503 表示业务暂未开放。调用处以 `catch` 展示可理解的反馈，不能将失败当成保存成功。

## 模型

```text
user
  id / account / name / displayName / studentId / role
  stallId（仅商家）/ phone / email / canteen / avatarTone
  preferences: { spice, cuisines[], avoidIngredients[], mealTime }
  lastLoginAt

session
  token（随机 32 字节）/ userId / expiresAt

summary
  totalOrders / pendingOrders / completedOrders
  recentOrders[]: { id, status, total, createdAt }
```

`role`：`student` / `merchant`。`avatarTone`：`leaf` / `peach` / `sky` / `oat`。`spice`：`none` / `mild` / `medium` / `hot`。食堂、菜系、食材和取餐时段的当前允许值见 `server/auth.cjs`，新增选项先由陈续文更新契约，再由王鸿更新账户服务白名单和账户页面；其他业务由对应负责人同步控件，避免两人同时编辑同一文件。

## 联调约束

- 陈续文维护 `api/http.js` 的超时、鉴权头及 401 事件，领域 API 返回 `response.data`；任何页面不直接查询用户原始库。
- 后续订单使用数据库用户 `id`（例如 `student-1`）作为 `userId`，不能混用学号或昵称，否则个人摘要无法正确过滤。
- 菜单、点餐车、下单、订单状态、Vant 移动端不在本次页面 A 完成范围。对应负责人接入后，必须追加字段约束、商家档口范围与接口用例。
- 浏览器测试和接口测试使用独立运行数据库，不修改提交的种子或同学的本地使用记录。
