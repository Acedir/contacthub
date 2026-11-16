# 拾光通讯录 · Luma Contacts

> 一个本地优先的个人通讯录：收藏重要联系人、记录多种联系方式，并支持带预览的 Excel 导入与带样式的 Excel 导出。

[![React](https://img.shields.io/badge/React-19-1f6f54)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-9%20unit%20%2B%206%20E2E-2f6a57)](#测试)

![拾光通讯录首页](docs/screenshots/home-viewport.png)

## 项目简介

拾光通讯录是软件工程（FZU–MU）课程作业的个人项目。它面向“重要的人不应该淹没在通讯录里”这一场景，提供收藏、搜索、标签、多联系方式管理和 Excel 双向流转。应用是纯前端 SPA，所有数据保存在浏览器 `localStorage`，不依赖后端即可运行。

- **目标仓库地址（发布后生效）**：`https://github.com/Acedir/contacthub`
- **本地访问地址**：`http://127.0.0.1:4173`
- **公网演示**：可选加分项暂未部署，仓库内提供了 Docker / Render / Nginx 部署配置
- **运行视频**：[docs/demo/contacthub-demo.webm](docs/demo/contacthub-demo.webm)
- **博客**：[docs/blog.md](docs/blog.md)

> 如果 GitHub 用户名不是 `Acedir`，请在发布后替换 README、博客和 `docs/DEPLOYMENT.md` 中的仓库链接。

## 功能对照

| 作业要求 | 实现 |
| --- | --- |
| 收藏联系人（25 分） | 卡片星标、收藏视图、侧栏收藏计数、收藏状态持久化 |
| 多种联系方式（10 分） | 电话 / 邮箱 / 地址 / 社交四类，每类可多条，可标注用途，自动去重 |
| Excel 导出（25 分） | 每位联系人独立一行；姓名、公司等基础信息独立列；每种联系方式按“标签 + 值”动态扩展列；带表头样式、冻结窗格、筛选、说明 Sheet |
| Excel 导入（25 分） | 表头别名识别、数据预览、跳过无效行、合并 / 追加两种策略、模板下载 |
| 页面样式（10 分） | 完整设计系统、响应式布局、动效、空状态、Toast、移动端底部导航 |
| 云部署（可选 15 分） | 未部署公网环境；提供一键 Docker、Render 与 Nginx 配置 |

## 技术栈

- **React 19 + TypeScript**：严格模式，组件与数据模型分离
- **Vite 8**：开发与生产构建
- **ExcelJS 4**：浏览器端读写 `.xlsx`，支持样式、冻结、自动筛选和说明页
- **Vitest**：数据层与 Excel 往返测试
- **Playwright**：真实 Edge 浏览器端到端测试与演示录制
- **localStorage**：本地优先的数据持久化，无后端

## 快速开始

环境要求：Node.js ≥ 22.12（推荐 24 LTS；Vite 8 本身支持 20.19+，但 Vitest 5 要求 22.12+），pnpm ≥ 9。

```bash
pnpm install
pnpm dev
# 打开 http://localhost:5173
```

生产预览：

```bash
pnpm build
pnpm preview
# http://localhost:4173
```

测试：

```bash
pnpm typecheck
pnpm test        # 9 个单元测试
pnpm test:e2e    # 6 个 Playwright 用例（会自动启动 127.0.0.1:4173）
```

首次打开会载入 9 位虚构示例联系人。删除或编辑不会影响其他浏览器；需要重置示例数据时，在 DevTools 执行：

```js
localStorage.removeItem('contacthub.contacts.v1')
location.reload()
```

## 使用说明

1. **收藏**：点击卡片右上角星标；侧栏「我的收藏」只显示星标联系人。
2. **搜索**：支持姓名、公司、职位、生日、备注、标签和所有联系方式；`Ctrl / ⌘ + K` 聚焦搜索框。
3. **多联系方式**：新建或编辑联系人时，在电话、邮箱、地址、社交四个分组中分别添加多条；每条可写用途标签（如“手机”“工作”“微信”）。
4. **标签**：用中英文逗号或分号分隔；侧栏按标签筛选。
5. **导出**：侧栏、顶栏或移动端底部“导出”均会导出全部联系人。
6. **导入**：从侧栏或顶栏打开导入，选择 `.xlsx / .xlsm` 后先预览，再选择「智能合并」或「全部追加」。

### Excel 导出格式

基础列为：`序号 / 姓名 / 公司 / 职位 / 生日 / 收藏 / 标签 / 备注`。之后按联系人中实际最多联系方式数量动态生成：

| 手机 1 标签 | 手机 1 | 手机 2 标签 | 手机 2 | 邮箱 1 标签 | 邮箱 1 | 地址 1 标签 | 地址 1 | 社交 1 标签 | 社交 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 手机 | 138 0000 1024 | 工作 | 021-6888 1024 | 个人 | name@example.com | 工作室 | 上海市…… | 微信 | wechat_id |

表格还有「导入说明」Sheet。导入时也兼容 `姓名 / 电话 / 邮箱 / 地址 / 收藏 / 标签 / 备注` 这样的简单表格，以及旧格式 `.xls` 以外的常见表头别名。

## 目录结构

```text
contacthub/
├── src/
│   ├── components/          # 侧栏、卡片、详情抽屉、表单、导入弹窗等
│   ├── data/seed.ts         # 虚构示例数据
│   ├── lib/
│   │   ├── contacts.ts      # 搜索、去重、合并、格式化
│   │   ├── excel.ts         # Excel 导出、解析、模板
│   │   ├── storage.ts       # localStorage 读写与数据校验
│   │   └── excel.test.ts    # 单元 / 往返测试
│   ├── App.tsx              # 页面编排与状态管理
│   └── styles.css           # 设计系统与响应式样式
├── e2e/                     # Playwright 端到端测试
├── scripts/                 # 截图、演示视频、开发服务器脚本
├── docs/                    # 博客、截图、视频、部署与自评文档
├── Dockerfile
├── render.yaml
└── nginx.conf
```

## 设计要点

- **数据只增不丢**：单个联系人用 `methods: ContactMethod[]` 保存联系方式，避免为电话/邮箱固定数量字段；导入合并时按“类型 + 规范化值”去重。
- **本地优先**：状态变化即写入 `localStorage`；读取时对旧数据做归一化，损坏数据回退到示例数据。
- **Excel 可往返**：导出与导入使用同一套列名规则；导出后无需修改即可再次导入。
- **可访问性**：语义化按钮、`aria-label`、键盘打开联系人卡片、弹窗 Esc 关闭、焦点回收与 Tab 循环、`prefers-reduced-motion`。
- **渐进增强**：ExcelJS 通过动态 import 拆分为独立 chunk，首页初始 JS 约 298 KB，Excel 功能按需加载。

## 测试与质量

```text
✓ 9 unit tests   数据过滤 / 去重 / 标签 / 合并 / Excel 导出与导入往返
✓ 6 E2E tests    收藏筛选 / 新建多联系方式 / 导出下载 / 导入预览 / 删除 / 移动端布局
✓ TypeScript     strict，无 any 滥用
```

E2E 使用真实 Microsoft Edge（Playwright `channel: 'msedge'`），覆盖桌面 1440×1000 与移动端 390×844。

## 部署

### Docker

```bash
docker build -t luma-contacts .
docker run --rm -p 8080:80 luma-contacts
# http://localhost:8080
```

### Render（静态站点）

1. 将仓库推送到 GitHub。
2. 在 Render 新建 Static Site，连接仓库。
3. Render 会读取 `render.yaml`；构建命令为 `corepack enable && pnpm install --frozen-lockfile && pnpm build`，发布目录 `dist`。
4. 设置 SPA rewrite：`/* -> /index.html`。

> 注意：云部署是作业的可选加分项。本项目未使用任何个人云账号，因此没有公网地址；配置已准备好，拥有账号后可在 5 分钟内完成部署。

## 文档

- [课程博客（含需求、截图、视频、Git 记录、分工、PSP）](docs/blog.md)
- [评分点自检表](docs/rubric-checklist.md)
- [部署与 GitHub 发布指南](docs/DEPLOYMENT.md)
- [使用手册](docs/USER_GUIDE.md)

## License

[MIT](LICENSE)
