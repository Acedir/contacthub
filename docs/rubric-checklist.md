# 评分点自检表

> 用途：提交前快速核对作业要求。自评分为保守估计，最终以教师/助教评分为准。

## 基础要求 · 30 分

| 检查项 | 分值 | 状态 | 证据 |
| --- | ---: | --- | --- |
| 博客使用 Markdown | 10 | ✅ | `docs/blog.md`，含元信息表、目录、代码块、表格、图片、视频链接 |
| 正确的 GitHub 仓库链接 | 10 | ✅ | 已公开：`https://github.com/Acedir/contacthub` |
| 代码规范链接 / 目录结构 | 10 | ✅ | README「目录结构」「设计要点」；TypeScript strict；组件与 lib 分层 |
| 功能实现思路 | 20 | ✅ | 博客第 3 节，含数据模型、导出列规则、导入合并策略 |
| 程序截图 | 20 | ✅ | `docs/screenshots/` 首页、详情、表单、导入、收藏、移动端 |
| 分工说明 | 20 | ✅ | 个人项目 100%；博客第 7 节 |

## 编码实现 · 70 分

| 检查项 | 分值 | 状态 | 证据 |
| --- | ---: | --- | --- |
| 页面样式 | 10 | ✅ | 完整设计系统、响应式三档、空状态、Toast、动效、移动端导航 |
| 收藏联系人 | 25 | ✅ | 星标、收藏视图、计数、持久化；E2E 用例 1 |
| 多种联系方式 | 10 | ✅ | 4 类方法 × 不限条数 × 用途标签；去重；详情分组；E2E 用例 2 |
| Excel 导出 | 25 | ✅ | 一人一行、基础列独立、联系方式动态扩展列、样式、说明 Sheet、自动筛选 |
| Excel 导入 | 25 | ✅ | 别名表头、预览、校验、合并/追加、模板、错误提示；单测 + E2E |
| 云端部署（可选） | +15 | ✅ | GitHub Pages 公网：`https://acedir.github.io/contacthub/` |

## 作业流程要求

| 要求 | 状态 | 说明 |
| --- | --- | --- |
| 建立 GitHub 仓库，提交 ≥ 3 次 | ✅ 已推送 7 次 | `https://github.com/Acedir/contacthub` |
| 代码可构建 | ✅ | `pnpm install && pnpm build` |
| 博客按时提交 | ✅ 内容完成 | 2026-11-17 完成，早于 11-17 23:59 截止 |
| 博客发布后审核 | ⚠️ 待平台发布 | 发布后留出审核时间 |
| 完整运行视频 | ✅ | `docs/demo/contacthub-demo.webm`，约 42 秒 |
| 截图 GitHub 提交历史 + 贡献统计 | ✅ | `docs/screenshots/github-commits.png`、`github-repository.png`；7 Commits / 1 Contributor |
| 成员贡献比例合计 100 | ✅ | 个人 100% |

## 验收命令

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

预期：

```text
TypeScript: 通过
Vitest: 9 passed
Playwright: 6 passed
Vite: built successfully
```

## 已知限制

1. 数据存储在浏览器 `localStorage`，不跨设备同步；通过 Excel 迁移。
2. 导入按姓名智能合并；同名不同人会被合并，可改用“全部追加”。
3. 单次导入最多读取 5000 行；仅支持 `.xlsx` / `.xlsm`。
4. 已部署 GitHub Pages（静态云托管）；Docker / Render 配置保留，可迁移到云服务器。
5. GitHub 仓库已发布；如果仓库迁移，请同步更新 README、博客与部署文档中的链接。
