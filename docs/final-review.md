# G5 终版审查与验收

核查日期为 2026-11-23。复查从 GitHub `main` 的 [f4edce6](https://github.com/WangHong3501/web-framework-final-canteen/commit/f4edce6065618af1ef25ac855f15a6604c5723bc) 开始。依据为[题目册 G5 与 T1–T7](../期末大作业-小组项目题目册（六组六题）.md)、[答辩评分表](../期末大作业-答辩评分表.docx)和[实验报告模板](../期末大作业-WEB前端框架技术-实验报告模板.docx)。终版程序提交为 [7c4bf0a](https://github.com/WangHong3501/web-framework-final-canteen/commit/7c4bf0a)。本页记录可复验的证据，正式评分由教师确定。

## 原有差距与整改

| 复查发现 | 终版行为 | 如何核对 |
| --- | --- | --- |
| 跨档口混加可以下单，但提交时返回 `MIXED_STALLS`；缺少手动清空 | 两端按档口显示件数及小计，只提交勾选的组，服务端复核菜价。成功后仅扣已提交份数，保留其他组。清空前可取消。 | [浏览器双端用例](../web/tests/e2e/checkout.spec.js) |
| 下单时连接中断可能留下重复订单 | 同一账号、同一笔内容的重试复用请求标识；服务端随订单保存回执，并发重试只产生一笔。 | [接口回归](../web/tests/api/data-api.test.js) |
| 明细订单已经待取餐，概览仍计作零；其他档口订单出现操作按钮 | 摘要统计 `ready`，工作台按归属提供操作，经营概览按本档口汇总，新订单排在前面。 | [经营概览实测](../screenshots/G5-21-档口经营.png) |
| 售罄和下架混用；种子星级无法反映购买者评价 | 下架菜只在本档口管理页可见，结算时再次检查。在本人已取餐订单上按菜打星，改评更新原记录，详情可读回真实均分。 | [菜品管理用例](../web/tests/e2e/dishes.spec.js) · [取餐后评价](../screenshots/G5-22-取餐后评价.png) |
| 部分页面使用 `script setup`；菜单多菜共图，移动按钮和文字对比度存在问题 | 页面统一选项式 API。12 道菜各配本地 WebP；首屏可直接筛选，加减、结算与对话框具备可识别名称、焦点和错误反馈。 | [桌面菜单](../screenshots/G5-08-菜单-桌面.png) · [375 px 手机结算](../screenshots/G5-23-手机分档口结算.png) |
| 原说明停在 M3，旧脚本依赖运行状态，生产预览的 6 页扫描未过，25 个文件未通过格式检查 | 隔离数据库、可重跑的单元/接口/浏览器/预览/生产检查；提供部署入口、静态托管配置、README 与按模板填写的报告。 | [启动说明](../README.md) · [实验报告](./G5-食堂线上点餐系统实验报告.docx) · [PDF 预览](./G5-食堂线上点餐系统实验报告.pdf) |

## 评分表逐项对照

| 评分项 | 评分表分值 | 能展示的证据及待验条件 |
| --- | ---: | --- |
| A1 需求分析 | 4 | 学生负责选餐、下单、取餐与评价；商家负责本档口菜品、出餐与经营。优先顺序为 F1–F5、E6/E7、O8；逐项场景见下表。 |
| A2 架构设计 | 6 | 路由表、组件树、状态模型、接口设计见下节。页面 A/B 早期设计另见 [页面 A](./page-a-design.md)、[页面 B](./page-b-design.md)。 |
| B1 必做功能 | 14 | F1–F5 各 2.8。桌面、移动和同源生产入口的实测全流程通过。评分表的“完成”要求线上演示，公网复验待办。 |
| B2 期望功能 | 4 | G5 题面列 E6 档口管理和 E7 搜索，两项均已实测。表内每项 1.3，两项按字面共 2.6；是否给足 4 分由教师统一口径。 |
| B3 核心动线 | 2 | 在真实本地 API 上完成登录、分档口下单、商家通知、学生取餐和评价。生产演练未产生运行时异常。 |
| C1 组件化 / T2 | 6 | FoodCard、MealSwitch、StallPicker 等使用 props/emits；FoodCard 的 action 插槽及 OrderShell 的默认插槽跨页面复用；菜单筛选用 computed，watch 同步筛选与路由。 |
| C2 路由 / T3 | 8 | 两处动态详情、四个嵌套子页、全局守卫及角色检查。每个有页面组件的路由记录都以动态 import 加载。 |
| C3 双组件库 / T4 | 5 | Element Plus Container/Menu/Form/Table/Dialog 进入真实页面；Vant 手机壳中的 Tabs、Stepper、Field、Dialog 和 SubmitBar 完成点餐。 |
| C4 Axios / T5 | 8 | `api/http.js` 统一超时、授权、请求计数和错误。四种 HTTP 方法均有界面调用；失败可重试，菜品改动、订单流转与评价均有回读。 |
| C5 Pinia / T6 | 8 | `user` 和 `cart` 各自管理身份、业务状态。actions 写入，getters 派生数量和金额。刷新恢复、旧数据迁移和账号切换有用例。 |
| D1 打包优化 | 4 | 两版同机实际构建，保留懒加载及库分包，压缩并本地化菜图。下节记录产物变化与代价，生产预览通过。 |
| D2 线上部署 / T7 | 6 | `base: './'`、hash 深链刷新已在本地生产构建验证。提供同源 Node 服务、Netlify 构建配置及 Nginx 示例。缺少公网及实体手机证据；表内线上不可访问时本项为 0–2 分。 |
| E1 Git 共建 | 5 | 五个成员账号有真实交付。基线非合并提交为王鸿 9、翟毅 6、其他三人各 1，提交数量不均衡；分工、PR 和直接合并记录见 [README](../README.md)。 |
| E2 命名与规范 / T1 | 3 | 36 个 Vue 单文件组件，业务页面均采用选项式 API。保留职责清晰的目录，清理空占位和废弃脚本，正式截图采用 G5 编号；格式检查通过。题目册另引的《00-规范》原件未随仓库提供，未独立逐条核对该文件。 |
| E3 文档质量 | 2 | README 含 Windows CMD 命令、版本、账号、端口和测试；实验报告沿用课程模板，附实测截图、数据与个人模块证据。 |
| F1 现场演示 | 4 | 备好双账号演示动线与独立演示库。现场演示由教师评价。 |
| F2 每人讲代码 | 6 | 下文列五位成员各自的代码与演示点。题目册允许职责兼担，评分表轮讲写六人；按实际五人准备，由教师确认适用口径。 |
| F3 现场抽问 | 5 | 提供守卫、金额与服务端校验、状态回读三个可现场验证的问题。现场抽问与个人互评待进行。 |
| G1 组件库进阶 | +2 | Element Plus 定向引入组件与样式，Vant 弹窗、函数式确认、提交栏和步进器进入同一真实业务流程。 |
| G2 自学技术 | +2 | GSAP 依生命周期创建/回收动画，并响应减少动效偏好；Playwright 与 axe 检查交互和可访问性。是否认定为课程外自学由教师判断。 |
| G3 创新与超额完成 | +2 | O8 成交评价、双端分档口结算与防重复提交有实测。加分合计封顶 5，最终总评以 100 为上限。 |

## 题目清单与验收入口

| 题目要求 | 验收操作 | 预期和实测 |
| --- | --- | --- |
| F1 登录与守卫 | 未登录直访个人资料，后用学生访问管理页 | 返回登录且保留站内目标，学生访问商家页被拦截；刷新可恢复有效会话。 |
| F2 菜单浏览 | 选择档口，切换分类和餐次，点入一道菜 | 列表与筛选同步，动态参数决定详情；售罄状态可见。 |
| F3 Pinia 点餐车 | 加减菜品、刷新、取消清空、再确认清空 | 数量与金额联动；刷新保留，取消保留菜品，确认后餐车为空。 |
| F4 下单 | 加入两个档口的菜，仅提交其一；重复发送同一标识 | 返回一笔订单、取餐码与服务端核定总额，另一档口保留；重试取回同一订单。 |
| F5 订单与状态 | 商家找到新单并通知，学生重新查看、确认取餐 | 新单排首位；备餐中 → 待取餐 → 已完成，个人中心待取餐数同步。 |
| E6 档口管理 | 商家新增、改价、下架、重新上架并删除菜品 | 每次回读服务器结果，下架后学生不可见；其他档口订单供查看，写操作受限。 |
| E7 搜索 | 在档口与类别筛选下输入菜名，再输入无匹配词 | 双端按当前条件显示匹配结果或可恢复的空态。 |
| O8 评价打星 | 从已完成的本人订单提交星级，再修改同一条评价 | 订单与菜品详情读回更新后的值；评价数维持一条，不能评价他人订单。 |

## 架构与实现

| 路由 | 访问角色 | 页面职责 |
| --- | --- | --- |
| `/`、`/login` | 访客、已登录用户 | 默认前往个人概览；登录后回到经过校验的站内目标。 |
| `/center/{overview,profile,preferences,security}` | 两种角色 | CenterLayout 挂载二级 router-view，分别负责摘要、资料、用餐偏好和账号安全。 |
| `/menu`、`/dish/:id` | 两种角色 | 组合筛选、动态详情和同档口推荐。 |
| `/cart`、`/mobile` | 学生 | 分档口结算与 Vant 移动点餐。 |
| `/orders`、`/order/:id` | 两种角色 | 订单列表与详情，按会话和归属决定可见数据和操作。 |
| `/admin/dishes`、`/admin/overview` | 档口商家 | 菜品管理及本档口经营指标。 |
| `/forbidden`、`/service-unavailable`、未知路径 | 公开状态页 | 权限提示、断网重试、找不到页面，由 StatusView 承载。 |

主要组件的实际组合如下。页面均由 [router/index.js](../web/src/router/index.js) 加载。

```text
App / RouterView
├─ LoginView
├─ CenterLayout / RouterView → OverviewView、ProfileView、PreferencesView、SecurityView
├─ MenuView → DishTopBar、DishStallTabs、MealSwitch、FoodCard → PriceTag / StatusTag
├─ DishDetailView → DishTopBar、DishRelatedGrid
├─ AdminDishesView → DishTopBar、DishFormDialog、Element Plus Table
├─ CartView / OrdersView / OrderDetailView / AdminDashboardView → OrderShell → DishTopBar + slot
│  ├─ CartView → StallPicker
│  └─ OrderDetailView → OrderStatusFlow、PickupCode、PriceTag
└─ MobileOrderView → PhoneFrame、Tabs、Stepper、SubmitBar、Dialog → StallPicker
```

| 数据与边界 | 权威来源与契约 |
| --- | --- |
| 身份 | `user` 持有脱敏资料、会话与有效期；`verifySession` 和服务端校验共同决定访问权限。保持登录决定保存位置。 |
| 餐车 | `cart` 保存所属账号、餐次、菜品数量与结算标识，getters 计算整数分总额和档口分组，成功后扣减请求快照。 |
| 菜品/档口 | `stalls` 与 `dishes` 通过 `stallId` 关联。`GET /dishes` 读取学生目录，`POST/PUT/DELETE /dishes` 或其 ID 子路径维护本档口菜品。 |
| 订单/评价 | `orders` 保存用户、档口、成交明细快照、总价、状态和评价。`POST /orders` 服务端核价；`PUT /orders/:id` 处理流转；`PUT /orders/:id/ratings/:dishId` 处理成交评价。 |
| 调用链 | 页面 → 领域 API → Axios 实例 → json-server 业务接口 → 运行库。生产环境同源前缀为 `/api`。具体参数、错误码、旧字段兼容见 [接口契约](./api-contract.md)。 |

## 实测与构建对照

同一台 Windows x64 主机、Node.js 22.23.2、npm 10.9.8、Vite 8.3.8。基线从 `f4edce6` 独立还原，终版另做锁文件全新安装与构建。体积是 dist 内实际字节数，gzip 为对各 JS 文件分别压缩后求和。用 `npm run build` 和 `node scripts/measure-dist.mjs` 可复查。

| 指标 | 基线 | 终版 | 变化说明 |
| --- | ---: | ---: | --- |
| dist 文件 | 75 | 85 | 新增独立菜图及按需资源，同时移除废弃代码。 |
| dist 总字节 | 1,815,467 | 1,753,171 | 减少 62,296 B（3.43%）。 |
| 图像资源（含图标） | 635,945 B | 544,233 B | 减少 91,712 B（14.42%），12 道菜对应 12 张独立 WebP。 |
| JS 字节 / 分文件 gzip | 805,554 / 299,372 | 829,465 / 306,290 | 新增约 6.9 kB gzip，包含双端结算、评价、Vant 组件及交互。 |
| 页面/布局 JS 分块 | 15 | 15 | 按文件名 View/Layout 统计，路由仍按需加载。 |
| Vite 报告的构建耗时 | 853 ms | 897 ms | 两版各记录一次本地构建，时间随缓存、机器负载变化。另一次锁文件全新安装后构建为 899 ms。 |

- `npm test`：55/55；`npm run test:e2e`：16/16。包含非法字段、跨档口写、购物车迁移、同键重试、角色切换、手机弹窗清空与取消、下单后刷新等。
- `npm run test:preview`：资源、hash 深链接、会话恢复、断网重试、减少动效通过。登录、概览、资料等六页的 axe WCAG A/AA 规则未发现违规。浏览器套件另覆盖菜单、菜品弹窗、手机结算等交互状态。自动规则结果仅覆盖实际扫描范围。
- `npm run test:production`：同一 Node 端口提供前端与接口。匿名业务读取返回 401，运行库不能从网页访问，12 张不同菜图解码成功。用两个独立会话完成新单、通知、取餐、评价及回读；学生页面记录的 HTTP 请求全部成功，双方页面均无未捕获异常。
- `npm run format:check`：通过。归档图来自桌面 Chrome 和 375 px 浏览器触屏模拟；实体设备与公网待验。

## 现场讲解与交接

| 成员 | 每人约 1–1.5 分钟的代码入口 | 可当场演示 |
| --- | --- | --- |
| 王鸿 | `src/router/index.js`、`stores/user.js`、`views/center/CenterLayout.vue` | 未登录直达嵌套地址，登录回跳，切换角色后权限改变。 |
| 李岷鳌 | `src/stores/cart.js`、`vite.config.js` | 两个档口各加一款菜，解释按分计算、持久化和单组结算。 |
| 翟毅 | `views/order/MenuView.vue`、`AdminDishesView.vue`、`components/dishes/DishFormDialog.vue` | 联动筛选、动态详情、菜品改价后的接口回读。 |
| 陈续文 | `server/index.cjs`、`server/db.cjs`、`src/api/http.js` | 显示订单网络请求与服务端核价，说明错误码和加载状态如何传回页面。 |
| 江贤松 | `views/mobile/MobileOrderView.vue`、`components/ui/PhoneFrame.vue`、`styles/mobile.css` | 用 Vant 步进器、提交栏和确认框结算，解释双端如何复用同一餐车。 |

抽问举例：① 已登录为何还要校验会话？后端可使令牌过期，守卫需恢复可信身份。② 浏览器传一个更低的价格会怎样？订单只接受 ID 和数量，服务端按当前目录核价。③ 为什么切换用户不能沿用餐车？业务状态归属于用户，切换账号时清理旧状态，避免误下单。

**尚待现场或外部条件确认**：小组取得平台与 HTTPS API 后，按[部署说明](./deploy-32605150622.md)配置并记录公网地址，用实体手机走完取餐流程。课堂 M1 审阅、个人署名心得、现场讲解、互评及教师评分由相应人员填写。Word 报告保留官方填写栏。
