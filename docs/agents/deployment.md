# 构建、部署与 Git 通道

> 由根目录 `AGENTS.md` 拆分而来，属于功能级文档（渐进式披露）。先读 `AGENTS.md` 了解全局约定，改到本模块时再读本文；本模块有新口径 / 新规则时，同步更新 `AGENTS.md` 索引与本文。

## 构建与部署

构建链路：

1. `pnpm build` → `apps/cent` 的 `build` 脚本 → `pnpm run lint`（tsc + biome）。
2. `vite build`，`outDir` 在 `apps/cent/vite.config.ts` 中被设为 `resolve("../../dist")`，即产物落在仓库根 `dist/`。
3. 产物包含 `index.html`、`assets/`、`sw.js`、`manifest.webmanifest`、`_headers` 等，可直接静态托管。

Cloudflare Pages（本 fork 的测试环境）：

- 项目名：`cent-test`，生产域名：https://cent-test.pages.dev
- 已使用的部署命令（在仓库根目录、构建完成后执行）：

```bash
npx --yes wrangler@3.114.17 pages deploy dist --project-name cent-test --branch main
```

- 需要先完成 Cloudflare 登录。如果本机代理环境变量拦截 wrangler，可在命令前清空代理：

```bash
HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= npx --yes wrangler@3.114.17 pages deploy dist --project-name cent-test --branch main
```

- `npx wrangler@3.114.17 whoami` 可确认登录态（本机已通过 OAuth 登录）。发布前务必先 `pnpm build` 刷新根目录 `dist/`，部署后访问 https://cent-test.pages.dev 验证。前面的代理前缀只作用于该条命令，不写盘、不改全局环境变量。
- **必须带 `--branch main`**：不带时 wrangler 会按当前 git 分支发布，只生成 `<hash>.cent-test.pages.dev` / `feat-ui-261106.cent-test.pages.dev` 这类预览域名，`cent-test.pages.dev` 主域名仍是旧版（踩过：以为已发布，线上页面没变）。工作区有未提交改动时加 `--commit-dirty=true`，否则 wrangler 会拦。
- **部署后核对线上内容**：`curl` 取 `<title>` 与 `manifest.webmanifest` 的 `name` / `short_name` / `description`；**文案在语言分片里**（`assets/zh-*.js` / `assets/en-*.js`），不在 `index-*.js` 主 bundle，新加的中文文案要去对应语言分片里 grep，否则会误判「没发上去」；图片资源用 `md5sum` 与本地文件比对。
- 部署会覆盖线上测试环境，只能在用户明确要求时执行。
- **push 走 SSH，不需要代理**：`origin` 已切到 `git@github.com:wxtttt/Cent.git`，`ssh -T git@github.com` 应返回 `Hi wxtttt! You've successfully authenticated`。账号已加入本机公钥（`~/.ssh/id_rsa.pub`），`~/.ssh/config` 固定 `IdentityFile ~/.ssh/id_rsa` + `IdentitiesOnly yes` + `ServerAliveInterval 30`，避免遍历不存在的 key。**公钥内容与指纹只留在本地，不要写进仓库或任何文档**。实测 `github.com:22` 与 `ssh.github.com:443` 都直连可达，只有 `github.com:443`（HTTPS）不通——所以 SSH 不需要 7890 代理，**别给 SSH 命令加代理前缀**。
- **HTTPS 是备用通道**（远端名 `origin-https`）：直连 `github.com:443` 不通（报 `Connection was reset` 或 connect 超时，同环境下 `api.github.com` 反而能通，别被误导）。推 HTTPS 得走本机 `127.0.0.1:7890`（系统设置 `ProxyEnable=0`，但端口在监听），且 **Bash 工具内访问 localhost 代理会被拦**（`curl -x` 返回 000），必须在 PowerShell 工具里带 `-c http.proxy=http://127.0.0.1:7890`。SSH 偶尔走不通时先切 `ssh.github.com:443`（config 里有注释好的备用段），再考虑代理。
- **SSH 主机指纹**：`~/.ssh/known_hosts` 里原来的 github.com RSA-2048（`nThbg6k…`）是投毒假指纹，会先触发「REMOTE HOST IDENTIFICATION HAS CHANGED」直接拒连（比认证失败更早出现）。真实指纹以 `https://api.github.com/meta` 的 `ssh_key_fingerprints` 为准，已清理并备份为 `known_hosts.bak.*`；再遇到该警告先比对官方指纹，不要盲目 `-R` 删除。
