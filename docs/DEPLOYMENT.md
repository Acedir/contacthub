# 部署与 GitHub 发布指南

本项目是纯静态 SPA，构建产物在 `dist/`，不需要数据库或 API。当前已部署到 GitHub Pages：

- **线上地址**：<https://acedir.github.io/contacthub/>
- **仓库**：<https://github.com/Acedir/contacthub>

以下步骤可用于重新发布、迁移到云服务器或自建主机。

## 0. GitHub 仓库与 Pages

当前仓库已推送 `main` 分支与 `v1.0.0` 标签，`gh-pages` 分支保存构建产物。线上版本由 GitHub Pages 从 `gh-pages` 分支提供。

远端配置：

```bash
git remote set-url origin https://github.com/Acedir/contacthub.git
git push -u origin main
pnpm build
```

然后把 `dist/` 内容提交到 `gh-pages` 分支并推送，在仓库 Settings → Pages 选择 `gh-pages` 分支。`vite.config.ts` 使用 `base: './'`，因此同一份构建既能在根路径运行，也能在 `/contacthub/` 子路径运行。

## 1. Docker（推荐自建服务器）

```bash
docker build -t luma-contacts .
docker run -d --name luma-contacts -p 80:80 --restart unless-stopped luma-contacts
```

服务器安全组放行 80/443。若需要 HTTPS，建议在前面加 Caddy / Nginx / 云厂商证书，不要直接把 80 端口暴露为唯一入口。

`Dockerfile` 使用多阶段构建：Node 构建静态文件，Nginx 提供服务；`nginx.conf` 已配置 SPA fallback、gzip 和静态资源缓存。

## 2. Render（免费静态托管）

1. 注册 / 登录 Render，选择 **New → Static Site**。
2. 连接 GitHub 仓库。
3. Render 自动读取 `render.yaml`：
   - Build Command：`corepack enable && pnpm install --frozen-lockfile && pnpm build`
   - Publish Directory：`dist`
4. 确认路由 rewrite：`/*` → `/index.html`（`render.yaml` 已声明）。
5. Deploy，得到 `https://<service>.onrender.com` 形式的公网地址。

Render 免费实例首次访问可能较慢，这是平台冷启动行为，与应用代码无关。

## 3. Nginx（已有服务器）

```bash
pnpm install --frozen-lockfile
pnpm build
rsync -av dist/ user@server:/var/www/luma-contacts/
```

将 `nginx.conf` 中 `root` 改为 `/var/www/luma-contacts`，然后：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 4. GitHub Pages（当前方案）

线上地址：<https://acedir.github.io/contacthub/>

当前 `gh-pages` 分支保存 `dist/` 构建产物。发布更新：

```bash
pnpm install
pnpm build

# 在一个临时 worktree 中更新 gh-pages
git worktree add ../contacthub-pages gh-pages
cp -R dist/* ../contacthub-pages/
cd ../contacthub-pages
git add -A
git commit -m "deploy: update GitHub Pages"
git push origin gh-pages
cd ../contacthub
git worktree remove ../contacthub-pages
```

Vite 使用相对路径 `base: './'`，无需把资源路径写死为 `/contacthub/`；同一份构建也可以直接部署到根域名。

## 5. 验收公网部署

```bash
curl -I https://acedir.github.io/contacthub/
```

应返回 `200`，并且页面能：

- 打开首页并看到 9 位示例联系人；
- 星标联系人并刷新后保持收藏；
- 新建一个含多条电话/邮箱的联系人；
- 导出 `.xlsx`；
- 清空 localStorage 后重新导入该文件。

## 常见问题

**刷新后 404？**  
Nginx / Render 需要将未知路径 rewrite 到 `index.html`。本项目是单页应用，不需要服务端路由，但静态服务器必须做 fallback。

**导入 .xls 失败？**  
浏览器端 ExcelJS 读取 `.xlsx` / `.xlsm`。请在 Excel 中“另存为 → Excel 工作簿（*.xlsx）”。

**数据会同步到手机吗？**  
不会。应用是本地优先，无后端；请用「导出 Excel」→「导入 Excel」迁移。

**如何重置演示数据？**  
浏览器 DevTools 执行：

```js
localStorage.removeItem('contacthub.contacts.v1')
location.reload()
```
