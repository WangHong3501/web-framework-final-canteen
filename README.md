# WEB 前端框架技术期末大作业

**食光校园 · 食堂线上点餐系统（G5）**

学生可浏览校园档口和菜品、加入点餐车、下单及确认取餐。档口商家可维护本档口菜品、查看订单与经营概览，并推进本档口订单状态。项目使用课程演示数据与模拟会话。

**当前阶段为 M3 β 版本地联调。** 主分支已有 F1–F5、E6/E7 和 Vant 手机点餐。单档口下单到取餐已在生产预览走通。M4 已有构建与部署方案，线上地址及手机访问仍待验收。

- 审查日期 `2026-11-21`，代码基线 [`05b1357`](https://github.com/WangHong3501/web-framework-final-canteen/commit/05b135715ce9e4bb308d626447576d18ead65295)。
- [公开仓库](https://github.com/WangHong3501/web-framework-final-canteen) · [主分支](https://github.com/WangHong3501/web-framework-final-canteen/tree/main) · [Pull Requests](https://github.com/WangHong3501/web-framework-final-canteen/pulls?q=is%3Apr)

## 本地运行

首次获取可执行 `git clone https://github.com/WangHong3501/web-framework-final-canteen.git`。在 VS Code 打开仓库根目录，然后在 CMD 终端运行以下命令。Node.js 版本需满足 `^20.19.0 || >=22.12.0`，本次复查使用 Node.js `22.23.2` 与 npm `10.9.8`。依赖版本由 `web/package-lock.json` 锁定。

```cmd
cd web
npm ci
npm run dev
```

打开 [登录页](http://127.0.0.1:5173/#/login)。`npm run dev` 同时启动 Vite（5173）和本地 API（3001）。Windows 也可双击 [启动食光校园.cmd](./启动食光校园.cmd)，保持终端运行。若分窗口启动，在 `web/` 分别执行 `npm run dev:api` 与 `npm run dev:web`。

| 角色 | 演示账号 | 演示密码 | 体验路线 |
| --- | --- | --- | --- |
| 学生 | `32605150621` | `Shiguang@2026` | 点击「学生账号体验」，从 [校园菜单](http://127.0.0.1:5173/#/menu) 挑选同一档口的菜品，进入餐车、提交订单、查看取餐码。手机界面从 [Vant 点餐页](http://127.0.0.1:5173/#/mobile) 进入。 |
| 档口商家 | `merchant01` | `Shiguang@2026` | 点击「商家账号体验」，在 [档口菜品管理](http://127.0.0.1:5173/#/admin/dishes) 操作本档口菜品，在订单工作台推进本档口订单。 |

新版种子包含 4 个档口、12 道菜品和 2 笔示例订单。首次启动从 `web/db.json` 生成 `.local/db.runtime.json`，后续会继续使用这份运行库。已有运行库仍是旧菜单时，可以在 `web/` 使用独立的新版示例库启动。

```cmd
set "DB_FILE=.local\demo-20261121\db.runtime.json"
npm run dev
```

运行库与本地凭据文件均在 Git 忽略的 `web/.local/` 中。API 重启后需要重新登录。环境变量见 [web/.env.example](./web/.env.example)。

## 当前功能

| 范围 | 已实现内容 | 页面或模块 |
| --- | --- | --- |
| F1 登录与守卫 | 学生和商家登录、会话恢复、角色拦截，个人中心有概览、资料、用餐偏好和账号安全四个子页面 | `/login`、`/center/*` |
| F2 菜单与详情 | 按档口、餐次和菜品分类筛选，显示售罄状态，详情按菜品 ID 加载并支持切换同档口推荐 | `/menu`、`/dish/:id` |
| F3 点餐车 | 双端共用 Pinia 仓库，支持加减、逐项移除及刷新恢复。金额按整数分计算，下单成功后自动清空，手动清空入口待补 | `/cart`、`stores/cart.js` |
| F4 下单 | 服务端按当前菜价重新核算，每单限一个档口，生成订单号和四位取餐码 | `/cart`、`/mobile`、`POST /orders` |
| F5 订单与取餐 | 学生看本人订单，商家可推进本档口状态。已验证「备餐中 → 待取餐 → 已完成」 | `/orders`、`/order/:id` |
| E6 档口管理 | Element Plus 表格、表单与弹窗。新增、改价、上下架、删除接入接口，写入后重新读取。商家另有经营概览 | `/admin/dishes`、`/admin/overview` |
| E7 搜索 | 桌面端支持菜名、档口和描述关键词，手机端支持关键词及分类筛选 | `/menu`、`/mobile` |
| Vant 移动端 | 手机壳预览、分类和餐次、步进器、餐车结算弹窗及订单回显 | `/mobile` |
| O8 评价打星 | 详情显示种子数据中的评分，提交评价待开发 | `/dish/:id` |

工程使用 Vue 3、Vite、Vue Router hash 路由、Pinia 与持久化插件、Element Plus、Vant、Axios、GSAP 和 json-server。页面路由按需加载。账户与餐车各有独立 Pinia 仓库，统一网络层支持 GET、POST、PUT、DELETE。锁定版本以 [依赖锁文件](./web/package-lock.json) 为准。

## 审查与验收

下表记录 `05b1357` 的复查结果。测试在隔离的代码副本和示例数据库中完成。

| 检查 | 实测结果 |
| --- | --- |
| `npm test` | **51 / 51 通过**，含单元与接口测试 |
| `npm run test:e2e` | **14 / 14 通过**，覆盖账户流程、档口筛选、动态详情、菜品增删改及移动布局 |
| `npm run build` | 通过。Vite 用时 841 ms，产出 75 个文件，未压缩总大小 1,815,467 B。入口 JS 分块为 15.29 kB（gzip 6.21 kB） |
| 生产预览实测 | 单档口桌面下单、商家推进到待取餐、学生确认完成均通过，Vant 下单返回并显示新订单 |
| `npm run test:preview` | 静态资源、hash 路由、会话恢复和离线重试通过。axe 扫描的 6 个账户与异常页面均报告文字对比度问题，命令整体未通过 |
| `npm run format:check` | Prettier 报告 25 个文件需要整理 |

**待修项目**

- **跨档口结算**。餐车允许混加不同档口的菜，提交时 API 才以 `422 MIXED_STALLS` 拒绝。演示时请使用同一档口。结算页还需在提交前给出提示或提供按档口结算。 [餐车页面](./web/src/views/order/CartView.vue) · [接口约定](./docs/api-contract.md)
- **个人中心待取餐统计**。实测订单成为 `ready` 后，订单页显示「待取餐」，个人中心仍显示 `0 笔`。摘要接口目前统计 `pending`，需同步订单状态口径。 [账户摘要接口](./web/server/auth.cjs) · [个人中心概览](./web/src/views/center/OverviewView.vue)
- **商家订单操作**。订单工作台可查看各档口订单，前端也为其他档口的进行中订单显示「推进状态」。接口只允许操作本档口订单，前端需按归属显示操作。 [订单工作台](./web/src/views/order/OrdersView.vue) · [接口约定](./docs/api-contract.md)
- **对比度和课程规范**。生产预览发现部分按钮文案和辅助文字对比度不足。菜单、详情和档口管理采用选项式 API，餐车、订单和 Vant 页仍使用 `<script setup>`，需对照课程 T1 统一。 [公共样式](./web/src/styles/overrides.css) · [课程题目册](./期末大作业-小组项目题目册（六组六题）.md)

在 `web/` 可复跑 `npm test`、`npm run test:e2e`、`npm run build` 和 `npm run test:preview`。`test:preview` 需要先构建。Windows 的浏览器测试使用 Chrome，E2E 使用端口 5174/3002，生产预览测试使用 4175/3003。浏览器测试会刷新仓库根目录 `screenshots/` 的验收图，复查时可使用独立检出目录。

## 构建与部署

前端产物在 `web/dist/`。手动预览时，先在 `web/` 执行 `npm run build`，在一个终端运行 `npm run dev:api`，另一个终端执行 `npm run preview`，随后访问 [生产构建本地预览](http://127.0.0.1:4173/#/login)。

线上方案由静态前端和常驻 Node API 组成。当前示例使用 Nginx 将同源 `/api/` 转发至本机 3001，健康检查路径为 `/api/health`。截至本次审查，仓库的 GitHub Pages 未启用，也未记录可验收的线上地址。M4 需要补充实际地址和手机端下单至取餐验证。 [部署说明与优化对比](./docs/deploy-32605150622.md) · [Nginx 配置](./deploy/nginx.conf)

## 小组成员与交付

王鸿是组长和仓库创建者，其余四位为组员。五位成员均有本人账号署名的提交进入 `main`。分工与协作记录如下。

| 学号 | 姓名 | GitHub 账号 | 负责范围 | 主分支交付证据 |
| --- | --- | --- | --- | --- |
| 32605150621 | 王鸿 | [WangHong3501](https://github.com/WangHong3501) | 页面 A、登录态、路由守卫、个人中心与集成 | [PR #1](https://github.com/WangHong3501/web-framework-final-canteen/pull/1) · [个人记录](./docs/contributions/32605150621-王鸿.md) |
| 32605150622 | 李岷鳌 | [21231gb](https://github.com/21231gb) | 点餐车金额与持久化、订单模块维护、构建优化和部署 | [提交 d0028d7](https://github.com/WangHong3501/web-framework-final-canteen/commit/d0028d704921738aa2874e2eb6eca85b17423c2b) 经 Git 合并进入 `main` · [个人记录](./docs/contributions/32605150622-李岷鳌.md) |
| 32605150604 | 翟毅 | [lulululululu28](https://github.com/lulululululu28) | 页面 B、菜单筛选、动态详情、档口菜品 CRUD | [PR #3](https://github.com/WangHong3501/web-framework-final-canteen/pull/3) · [个人记录](./docs/contributions/32605150604-翟毅.md) |
| 32605150601 | 陈续文 | [xuwen-max](https://github.com/xuwen-max) | 种子数据、json-server 业务接口、Axios 公共层和契约 | [PR #2](https://github.com/WangHong3501/web-framework-final-canteen/pull/2) · [个人记录](./docs/contributions/32605150601-陈续文.md) |
| 32605150615 | 江贤松 | [u12306q](https://github.com/u12306q) | Vant 手机点餐、公共 UI 与双端风格统一 | [提交 9060fa1](https://github.com/WangHong3501/web-framework-final-canteen/commit/9060fa1c544bf218ccf73e16bb21344b22ca1c5a) 直接进入 `main` · [双端记录](./docs/dual-ui-unification.md) |

后续协作以 `main` 为合并目标。先在 CMD 执行 `git switch main` 和 `git pull --ff-only origin main`，再从最新主分支创建 `feature/学号-模块`、`fix/学号-问题` 或 `docs/学号-主题` 分支。使用本人账号小步提交，推送分支后发起 PR，由组长审核与合并。跨模块的改动在 PR 中请对应文件的负责人核对。 [五人分工与协作边界](./docs/team-ownership.md)

## 工程与资料

```text
.
├── web/
│   ├── src/          Vue 页面、组件、路由、Pinia 与 Axios
│   ├── server/       json-server、会话、菜品和订单接口
│   ├── db.json       演示种子数据
│   ├── public/       本地图片与图标
│   └── tests/        单元、接口、浏览器与生产预览用例
├── docs/             设计、分工、接口、验收和个人贡献记录
├── deploy/           反向代理部署样例
├── screenshots/       已归档的验收图
└── 启动食光校园.cmd   Windows 启动入口
```

- [页面 A 设计](./docs/page-a-design.md) · [页面 A 验收](./docs/page-a-verification.md) · [页面 B 设计](./docs/page-b-design.md) · [页面 B 验收](./docs/page-b-verification.md)
- [接口契约](./docs/api-contract.md) · [设计规范](./docs/design-system.md) · [双端界面统一](./docs/dual-ui-unification.md) · [商家经营概览](./docs/merchant-dashboard.md)
- 截图可查看 [校园菜单](./screenshots/G5-15-菜单档口切换-桌面.png)、[菜品详情](./screenshots/G5-16-菜品详情-桌面.png)、[档口管理](./screenshots/G5-17-档口菜品管理-桌面.png) 和 [Vant 点餐](./screenshots/G5-10-移动点餐-真机.png)。

## 课程里程碑

| 阶段 | 当前证据 |
| --- | --- |
| M0 组队与建仓 | 已建仓并确定分工，五人均已有主分支提交 |
| M1 设计审阅 | 页面设计、分工和接口契约已入库，课堂审阅状态以教师记录为准 |
| M2 α 版 | 登录、核心菜单和接口已联通，主分支可运行 |
| **M3 β 版** | **核心功能已集成，完成本地流程复查**，课程 T1、结算交互、状态显示和对比度仍需收尾 |
| M4 部署 | 本地构建通过，已有 Nginx 方案，线上地址与手机动线验收待完成 |
| M5 答辩 | 继续汇总复验、个人讲解和实验报告 |

课程依据为 [小组项目题目册](./期末大作业-小组项目题目册（六组六题）.md)、[答辩评分表](./期末大作业-答辩评分表.docx) 和 [实验报告模板](./期末大作业-WEB前端框架技术-实验报告模板.docx)。
