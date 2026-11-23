# 页面开发 B 实际验收记录

> 阶段交付记录。下列提交、脚本和截图反映成员当时的实现。最终版本、运行命令与证据见[终版审查](./final-review.md)。


验收日期：2026-11-21。负责人：翟毅（32605150604）。验收基线为合并陈续文与江贤松提交后的 `origin/main`（`7aa7bfd`），范围覆盖 `web/src/api/dishes.js`、`web/src/components/dishes/**` 以及选项式 API 重构后的 `/menu`、`/dish/:id` 与 `/admin/dishes` 页面。

## 环境与复现

- 本机实测环境：Node.js `v24.15.0`、npm `12.0.2`、Chrome 浏览器（Playwright `1.65.0` + `@axe-core/playwright` `4.14.0`）。
- 依赖版本以 `web/package-lock.json` 为准（npm 12 默认 `allow-remote="none"` 时按锁文件镜像参数安装）：

```cmd
cd web
npm ci --registry=https://registry.npmmirror.com --allow-remote=all
npm test
npm run test:e2e
npm run build
node scripts/measure-dist.mjs
```

所有浏览器与接口测试均使用 `.local/` 临时数据库运行，未改写仓库提交的 `web/db.json` 种子数据。

## 执行结果汇总

| 检查项 | 实际结果 |
| --- | --- |
| 单元与接口测试（`npm test`） | **45 / 45 通过**（含王鸿/陈续文 39 条既有单测与接口测试 + 6 条 `dish-helpers.test.js` 单元测试，耗时 1075.7 ms） |
| 浏览器 E2E（`npm run test:e2e`） | **14 / 14 通过**（10 条 `auth-center.spec.js` + 4 条 `dishes.spec.js`，全轮耗时 1.3 分钟） |
| 页面 B 无障碍自动检查（axe WCAG 2 A/AA & 2.1 A/AA） | 扫描 `/menu`、`/dish/dish-01`、`/admin/dishes` 与新增弹窗打开态共 4 处，自动检测违规 **0** |
| 生产构建（`npm run build`） | **构建成功**（耗时约 855 ms—881 ms） |
| 代码格式检查（本人新增与改动文件） | `npx prettier --check` 全部通过 |

### 关于既有 `npm run test:preview` 的说明

执行 `npm run test:preview` 时，三项核心功能与路由样式冒烟均 **PASS**：
- `PASS route style ownership: login requests 2 CSS files, 112157 bytes; account CSS stays deferred.`
- `PASS production preview: assets, hash routes, remembered login and new-tab session validation.`
- `PASS production preview: offline recovery, preserved session, reduced-motion mobile rendering; zero runtime exceptions.`

在最后一步扫描页面 A（`login` / `overview` / `profile` / `preferences` / `security` / `service-unavailable`）时，脚本报告了来自 `origin/main`（`9060fa1`）未改动公共文件中的对比度错误（`.el-button--primary > span` 在 `overrides.css` 未重设 `--el-button-text-color: var(--white)` 导致对比度 1.31，`.top-nav__link--muted` 与 `OrderStatusFlow.vue` 使用 `#8a948b` 对比度 3.13 等）。为避免跨文件修改引发 PR 冲突，本分支未改写队友归属的 `overrides.css`、`tokens.css` 与 `account.css`，仅在 `.dish-shell` 作用域内确保页面 B 自身及相关组件对比度达标，并将在 Pull Request 中提请对应负责人修复。

## 功能与异常边界用例

| 编号 | 场景与输入 | 预期与实测行为 | 是否通过 |
| --- | --- | --- | --- |
| B01 | `/menu` 初始加载、档口 Tab 与餐次/分类/搜索 | 12 道菜品正常加载；`dish-11`（`status: 'danger'`）加车按钮自动禁用；切「麦香面馆」显示 3 道，切「早餐」显示 3 道，搜「红烧肉」命中 1 道，空结果支持一键重置 | 通过 |
| B02 | `/menu` 加菜与刷新恢复 | 点击加菜后调用 `useCartStore.add`，悬浮条显示已选 1 件，刷新页面后从 Pinia persist 恢复 | 通过 |
| B03 | `/dish/:id` 动态路由与整数分小计 | 打开 `/dish/dish-01`，调整份数为 2 时小计更新为 `¥36.00`，点击「加入餐车」后提示点餐车已有 2 份；点击同档口推荐「香煎鸡腿饭」切换到 `/dish/dish-02` | 通过 |
| B04 | 非法 `:id`（`/dish/bad!id`）与不存在 `:id`（`/dish/dish-999`） | 非法格式由 `isValidDishId` 直接拦截提示；不存在编号由接口返回 404 并展示可返回菜单的空态 | 通过 |
| B05 | `/admin/dishes` 商家视角隔离与上下架 `PUT` | 商家 `merchant01` 仅展示 `stall-1` 的 5 道菜品；切换 `dish-11` 上架/下架确认后发送 `PUT` 并重新 `GET`，刷新后统计与表格状态一致 | 通过 |
| B06 | 弹窗空提交校验与完整 `POST / PUT / DELETE` 闭环 | 空提交触发「请填写菜品名称」红字拦截；填写完整后 `POST` 新增并重新 `GET`、编辑改价 `PUT` 并重新 `GET`、二次确认 `DELETE` 后列表移除且刷新不复现 | 通过 |
| B07 | `375×812` 移动端适配 | `/menu`（4 列快捷入口、单列菜品卡片、换行餐次切换）与 `/dish/dish-01` 均满足 `scrollWidth <= innerWidth` | 通过 |

## 运行截图

截图均由 Playwright 实测运行生成，存放在 `screenshots/`：

| 截图 | 对应验证内容 |
| --- | --- |
| [G5-15 菜单档口切换桌面](../screenshots/G5-15-菜单档口切换-桌面.png) | 校园菜单页：档口 Tab 切换、餐次与分类筛选、关键词搜索与售罄遮罩 |
| [G5-16 菜品详情桌面](../screenshots/G5-16-菜品详情-桌面.png) | `/dish/dish-01` 动态详情、整数分小计、加车联动与同档口推荐 |
| [G5-17 档口菜品管理桌面](../screenshots/G5-17-档口菜品管理-桌面.png) | 商家绑定的本档口统计、`el-table` 清单、编辑/上下架/删除操作列 |
| [G5-18 菜品弹窗增删改桌面](../screenshots/G5-18-菜品弹窗增删改-桌面.png) | `DishFormDialog` 新增/编辑弹窗、字段校验与实景配图预览 |
| [G5-19 菜单详情手机](../screenshots/G5-19-菜单详情-手机.png) | `375×812` 移动端菜单排版（4 列快捷入口、单列菜品卡片、无横向溢出） |

## 构建与按需分包数据

通过 `node scripts/measure-dist.mjs` 实测 `web/dist/`：

| 指标 | 实测结果 |
| --- | --- |
| 构建产物总文件 / 总字节 | 72 个文件 / 1,817,908 B |
| JavaScript 文件数 / 总字节 / gzip | 42 个文件 / 808,219 B / 304,637 B |
| 最大 JS 文件（`index-*.js`） | 235,700 B / gzip 79,203 B |
| 页面/布局分块（`pageChunks`） | 15 个，全部按路由动态 `import()` 拆分 |
| 页面 B 独立分块 | `MenuView`（JS 24,136 B / CSS 19,897 B）、`DishDetailView`（JS 8,693 B / CSS 3,339 B）、`AdminDishesView`（JS 98,844 B / CSS 24,832 B） |

`DishStallTabs` 中的 `ElTabs`/`ElTabPane` 与 `AdminDishesView` 中的 `ElTable`/`ElTableColumn`/`v-loading` 均在对应组件内部局部按需引入，未修改全局入口 `web/src/main.js`，登录页与个人中心不会提前下载菜单表格组件代码。
