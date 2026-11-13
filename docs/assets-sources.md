# 页面资源来源

| 资源 | 来源 | 用途 |
| --- | --- | --- |
| 餐盘摄影 `web/public/images/fresh-bowl.jpg` | [Unsplash 图片原始资源](https://images.unsplash.com/photo-1546069901-ba9599a7e63c) | 登录与个人概览，下载为本地资源，避免页面运行时依赖第三方图片连接 |
| DM Sans Variable | npm 包 `@fontsource-variable/dm-sans` | 拉丁字符与数字；中文使用系统字体回退，字体文件随构建输出 |
| Lucide 图标 | npm 包 `lucide-vue-next` | 选择性导入导航、身份、表单与状态图标；没有使用其他产品商标 |
| 品牌标记 | 本项目 SVG | 原创碗与蒸汽标记，用于“食光校园”品牌及 favicon |

参考产品只用于总结交互与视觉取舍，未复制其他产品页面代码；具体案例和官方技能来源见 [页面 A 设计](./page-a-design.md)。
