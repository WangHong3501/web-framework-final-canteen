# 页面开发 A 设计与案例研究

## 实际案例与取舍

| 原始案例 | 可确认的产品做法 | 本项目采用的设计 |
| --- | --- | --- |
| [复旦大学校园一卡通使用指南](https://xxb.fudan.edu.cn/f7/dd/c2452a260061/page.htm) | 校园身份登录后管理账户信息；在线选餐与到窗口取餐形成连续流程 | 学工号/校园账户作为入口；个人中心集中管理资料、偏好和账户安全；取餐业务由订单模块衔接 |
| [淮阴师范学院同学快跑](https://hq.hytc.edu.cn/info/1036/10770.htm) | 提前点餐、到店自取，提供清楚的餐品介绍与可追溯订单 | 界面以校园用餐和自取场景组织；个人中心摘要从真实接口计算，不显示虚构订单或节省时长 |
| [CAVA 官方应用介绍](https://cava.com/rewards) | 预先下单、保留偏好、方便再次点餐 | 为“下次更方便”提供可保存的口味/食材偏好，避免用不工作的促销按钮填充账户页 |
| [Sweetgreen 官方门店应用介绍](https://www.sweetgreen.com/locations/naperville) | 食物摄影、收藏与提前点餐表达健康和便利 | 用餐盘摄影与绿色建立食物感；账户操作保持安静清晰，不照搬品牌、商标或页面代码 |

表中“本项目采用”是基于案例的设计判断，不代表与案例方合作，也不代表本项目已经具备其全部功能。

## 使用的技能

- [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)：先做设计取舍，再实现与截图自检。已通过 skill-installer 安装。
- [GreenSock gsap-skills](https://github.com/greensock/gsap-skills)：使用 `gsap-core`、`gsap-frameworks`、`gsap-timeline`、`gsap-performance`。用户提供的 `gaspskill` 精确名称未检索到，因此采用官方 GSAP 技能集。
- Vue 按课程选项式 API 实现，在 `mounted` 创建动画，在 `beforeUnmount` 清理；使用 scoped selectors、`matchMedia` 和减少动效偏好。

## 视觉方案

产品名为“食光校园”，面向学生与档口商家。主任务是顺利登录并管理个人账户。视觉重点只有一个：有真实食物质感的校园餐盘，其他控件为清晰的操作服务。

| Token | 值 | 用途 |
| --- | --- | --- |
| Forest | `#234b36` | 品牌、主按钮、关键标题 |
| Leaf | `#d5edaa` | 食物相关视觉与选中反馈 |
| Canvas | `#f6f7f3` | 页面背景 |
| Ink | `#24352c` | 正文 |
| Muted | `#586653` | 次要文字，保留足够对比度 |
| Line | `#e5e9e0` | 布局边界 |

拉丁文字和数字使用 DM Sans，中文使用系统清晰的无衬线字体。正文 14–16px，标题 28–48px；使用 8px 间距节奏。页面采用左对齐，表单标签固定在字段上方，避免以颜色作为唯一状态区分。

```text
登录：  品牌                                    帮助
        欢迎与身份切换       |    餐盘摄影
        学号/密码/表单反馈   |    校园自取场景
        登录/演示入口        |    简短品牌文案

个人中心：品牌 / 账户导航 / 校园信息 / 用户菜单
          身份 + 侧导航      | 嵌套路由页面
                            | 概览 / 资料 / 偏好 / 安全
```

设计复核：不使用食堂无关的金融仪表盘、不堆砌虚假增长指标、不使用无功能的第三方登录入口。餐盘摄影承担记忆点，表单及导航安静、可读。移动端改为单列与可滚动导航，保留完整操作。

## 路由与状态

| 路径 | 页面 | 权限 |
| --- | --- | --- |
| `/login` | 学生/商家登录 | 未登录入口；已登录跳转个人概览 |
| `/center` | 个人中心外壳 | 登录；默认重定向 `overview` |
| `/center/overview` | 食光概览 | 登录；真实账户摘要 |
| `/center/profile` | 个人资料 | 登录；白名单字段编辑 |
| `/center/preferences` | 用餐偏好 | 登录；保存后回读 |
| `/center/security` | 账号安全 | 登录；改密/会话退出 |
| `/menu`、`/orders` | 业务模块接入入口 | 登录；由对应负责人替换，当前不计业务完成 |
| `/admin/dishes` | 商家菜品入口 | 商家；学生访问进入无权限页 |
| `/forbidden` | 无权限 | 可返回本人个人中心 |
| `/service-unavailable` | 服务暂不可用 | 保留安全的站内目标，允许重试 |
| 未匹配地址 | 未找到页面 | 可返回个人中心 |

所有页面组件通过动态 import 懒加载。`meta.requiresAuth` 和 `meta.roles` 在守卫中统一判断。登录只接受站内白名单目标，不能用 `redirect` 参数跳到外部网址。路由守卫之外，模拟服务端也校验会话及角色。

用户仓库只持久化脱敏用户、token、有效期与“保持登录”选择，密码不会进入 Pinia 或浏览器持久化。每次首次进入或缓存到期都向服务端核验会话；断网时显示可重试状态，不伪装已登录成功。退出后清理两种存储并重定向；服务端 401 同样触发清理。

## 组件与数据流

```text
App
├── RouterView → LoginView
└── RouterView → CenterLayout
    ├── BrandMark / AppIcon / UserAvatar
    ├── Element Plus Menu
    └── RouterView
        ├── OverviewView → SectionPanel / StateNotice
        ├── ProfileView → Element Plus Form / UserAvatar
        ├── PreferencesView → 表单控件
        └── SecurityView → Form / Dialog
```

页面 → 用户仓库 action 或领域 API → 统一 Axios → 3001 json-server。写入成功后重新 GET，以服务器返回值更新视图。公共组件覆盖 props、自定义事件与 slot；computed 用于显示名、资料完整度等派生数据，watch 用于同步表单与标题/导航。

## 真实性与边界

身份服务是课程演示用途，基于本地 json-server 扩展。服务端使用密码散列与随机会话；不接入学校真实统一认证，也不处理真实支付。演示账号不是生产凭据。菜单、点餐车、订单流转和 Vant 页面仍由对应同学实现，不能将当前账户模块的入口状态算作 F2—F5 已完成。

验收用例和实际结果另见页面 A 验收记录，所有结论须经测试后填写。
