# 页面资源来源

| 资源 | 来源 | 用途 |
| --- | --- | --- |
| 餐盘摄影 `web/public/images/fresh-bowl.jpg` | [Unsplash 图片原始资源](https://images.unsplash.com/photo-1546069901-ba9599a7e63c) | 登录与个人概览，下载为本地资源，避免页面运行时依赖第三方图片连接 |
| DM Sans Variable | npm 包 `@fontsource-variable/dm-sans` | 拉丁字符与数字；中文使用系统字体回退，字体文件随构建输出 |
| Lucide 图标 | npm 包 `lucide-vue-next` | 选择性导入导航、身份、表单与状态图标；没有使用其他产品商标 |
| 品牌标记 | 本项目 SVG | 原创碗与蒸汽标记，用于“食光校园”品牌及 favicon |

参考产品只用于总结交互与视觉取舍，未复制其他产品页面代码；具体案例和官方技能来源见 [页面 A 设计](./page-a-design.md)。


## 菜单配图

`web/public/images/dish-01.webp` 至 `dish-12.webp` 是本次用内置 ImageGen 生成的菜单示意图。用同一张 3 列 × 4 行的食物摄影图集制作，按种子菜品编号拆分并压缩为独立 WebP。顺序为红烧肉饭、鸡腿饭、藜麦碗、宫保鸡丁、麻婆豆腐、牛肉拉面、番茄鸡蛋面、黑椒牛柳饭、鸡腿堡、时蔬沙拉、糖醋里脊、皮蛋瘦肉粥。开发时使用真实菜名与食材核对图块，静态资源随仓库发布。

生成描述要求每格独立呈现一道校园食堂菜，统一采用暖木色桌面、自然窗光、浅色餐具和 45° 取景，画面无文字和水印。历史照片路径继续供旧订单和既有资料使用。

## 界面审查依据

本次复查使用从 GitHub 获取的 [Vercel Web Design Guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines)，用于核对按钮名称、表单标签、键盘焦点、弹窗交互与窄屏布局。修复后的行为通过浏览器用例回归，见 [终版审查](./final-review.md)。
