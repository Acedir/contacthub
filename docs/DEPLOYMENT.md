# 部署与 GitHub 发布指南

本项目是纯静态 SPA，构建产物在 `dist/`，不需要数据库或 API。以下步骤任选一种即可。

## 0. 推送到 GitHub

当前目录已经是本地 Git 仓库。先在 GitHub 创建空仓库（不要勾选 README / .gitignore），然后：

```bash
git remote add origin https://github.com/<your-username>/contacthub.git
git branch -M main
git push -u origin main
```

如果使用 SSH：

```bash
git remote add origin git@github.com:<your-username>/contacthub.git
git push -u origin main
```

推送后：

1. 打开仓库 **Insights → Contributors** 截图；
2. 打开 **Commits** 页面截图；
3. 用这两张图替换 `docs/screenshots/git-history.png`，并按实际用户名更新 README、`docs/blog.md` 中的 `<https://github.com/Acedir/contacthub>`；
4. 如果希望保留本地历史截图，可将 GitHub 截图另存为 `docs/screenshots/github-history.png`，在博客中增加一段“GitHub 提交记录”。

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

## 4. GitHub Pages（可选）

纯静态项目可以发布到 GitHub Pages：

1. 在仓库 Settings → Pages 中选择 **GitHub Actions**。
2. 添加一个构建并部署 `dist` 的 workflow（本项目未内置，因为课程主要要求可运行仓库 + 博客）。
3. 注意 Vite 的 `base`：如果部署在 `https://<user>.github.io/contacthub/`，需要把 `vite.config.ts` 的 `base` 改为 `'/contacthub/'`。

## 5. 验收公网部署

```bash
curl -I https://<your-domain>/
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
