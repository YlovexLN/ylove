# 部署指南

本项目为 **SSR 模式**（含 `/api/bili-api` 运行时接口），支持多目标构建与部署。

## 多目标构建

`astro.config.mjs` 通过环境变量 `DEPLOY_TARGET` 在构建时自动选择适配器，**无需修改配置文件**。

| 目标 | 命令 | 产物 |
| --- | --- | --- |
| Node（本地 / 自托管） | `pnpm build` / `pnpm build:node` | `dist/` |
| Cloudflare Workers | `pnpm build:cloudflare` | `dist/client` + `dist/server` |
| Netlify | `pnpm build:netlify` | `dist/` + `.netlify/` |
| 腾讯云 EdgeOne | `pnpm build:edgeone`（待适配 Astro 7） | `.edgeone/` |

## 部署到 Node.js（自托管 / VPS）

1. **构建**（默认目标，等价于 `pnpm build:node`）

   ```sh
   pnpm build
   ```

   产物：`dist/`（`client/` 静态资源 + `server/` Node standalone 服务器）。

2. **运行**

   ```sh
   node ./dist/server/entry.mjs
   ```

   默认监听 `http://localhost:4321`，可用环境变量覆盖：

   ```sh
   HOST=0.0.0.0 PORT=8080 node ./dist/server/entry.mjs
   ```

   - `HOST` — 监听地址（公网部署用 `0.0.0.0`）
   - `PORT` — 监听端口（默认 `4321`）
   - `SERVER_CERT_PATH` / `SERVER_KEY_PATH` — 直接启用 HTTPS 时传入证书/私钥路径（一般建议由 Nginx / Caddy 等反代做 HTTPS）

3. **说明**
   - standalone 模式会自动托管 `dist/client/` 静态资源与页面/API 路由。
   - 自托管时可加载环境变量覆盖配置（如 `FOOTER_SHOW`、`STRAPI_URL`）：`FOOTER_SHOW=false node ./dist/server/entry.mjs`，或借助 dotenv / systemd EnvironmentFile。
   - 生产环境建议用 **pm2** / **systemd** 守护进程，并用 Nginx / Caddy 反向代理到该端口（提供 HTTPS、日志、自动重启）。

## 部署到 Cloudflare Workers ✅（已验证可用）

1. **构建**

   ```sh
   pnpm build:cloudflare
   ```

   产物：`dist/client`（静态资源）+ `dist/server`（Worker 入口 + 自动生成的 `wrangler.json`）。

2. **部署**

   ```sh
   pnpm exec wrangler deploy -c dist/server/wrangler.json
   # 或 cd dist/server && pnpm exec wrangler deploy
   ```

3. **说明**
   - 项目根 `wrangler.jsonc` 提供 `name` / `compatibility_date` / `compatibility_flags`（含 `nodejs_compat`），构建时自动合并到 `dist/server/wrangler.json`。
   - 环境变量（如 `STRAPI_URL`）：`pnpm exec wrangler secret put STRAPI_URL`。
   - 已通过 `wrangler deploy --dry-run` 验证（24 个 server 模块 + 25 个静态资源 + KV/Images/Assets 绑定正常）。

## 部署到 Netlify ✅（已验证可用）

1. **构建**

   ```sh
   pnpm build:netlify
   ```

   产物：`dist/`（静态资源）+ `.netlify/`（SSR 函数，由 `@astrojs/netlify` 自动生成）。

2. **本地预览**

   ```sh
   pnpm exec netlify dev
   ```

3. **部署**
   - 推送到 Git 仓库后，在 [Netlify 控制台](https://app.netlify.com) → **Add a new site → Import an existing project** 导入仓库。
   - 根目录 `netlify.toml` 已配置构建命令（`pnpm build:netlify`）与发布目录（`dist`），`.nvmrc`（24）固定 Node 版本，Netlify 自动读取。

4. **说明**
   - 环境变量（如 `STRAPI_URL`）在 Netlify 项目 `Site configuration → Environment variables` 中配置，修改后重新 Deploy 生效。
   - SSR 函数入口验证：`.netlify/build/entry.mjs` 正确导出 `createHandler`（`function`）。

## 部署到腾讯云 EdgeOne ⏳（待官方适配 Astro 7）

> **当前状态**：`@edgeone/astro@1.1.5` 仅支持 Astro 5 / 6，**尚未适配 Astro 7**。本项目已升级到 Astro 7，因此 `pnpm build:edgeone` 会失败。等待官方发布支持 Astro 7 的新版本后，移除 `astro.config.mjs` 中 `resolveAdapter()` 的 `edgeone` 分支注释即可恢复。

- 构建：`pnpm build:edgeone`（当前不可用），产物 `.edgeone/`（`assets/` + `cloud-functions/`）
- 项目配置：`edgeone.json`

  ```json
  {
    "name": "ylove",
    "installCommand": "pnpm install",
    "buildCommand": "pnpm build:edgeone",
    "outputDirectory": ".edgeone",
    "nodeVersion": "24.11.0"
  }
  ```

- 部署方式：
  - **Git 导入**：推送到 GitHub / GitLab 后，在 [EdgeOne Makers 控制台](https://console.tencentcloud.com/edgeone/makers) 导入仓库，自动构建部署。
  - **CLI**：`pnpm build:edgeone && edgeone makers deploy`。

## 环境变量（覆盖配置文件）

`Cloudflare Workers`、`Netlify` 与 `EdgeOne` 均支持用环境变量覆盖 `config.toml` 中的配置，免改代码。构建时读取，修改后需**重新构建部署**生效。

| 变量 | 说明 |
| --- | --- |
| `DEPLOY_TARGET` | 构建目标：`node` / `cloudflare` / `netlify` / `edgeone`（构建脚本已自动设置） |
| `PAGE_MODE` | 页面模式：`single` / `scroll` |
| `BILIBILI_UID` | B站 UID |
| `STRAPI_URL` / `STRAPI_TOKEN` | Strapi 数据源地址与 Token |
| `FOOTER_SHOW` | 页脚底部信息整行开关：`true` / `false` |
| `FOOTER_ICP_SHOW` | 备案号单独开关：`false` 只隐藏备案号 |
| `SPONSOR_SHOW` | 赞助总开关：`false` 隐藏首页赞助链接并禁用 `/sponsor` 页面（默认跟随 `config.toml` 的 `show`） |

> **优先级**：环境变量 > `config.toml`。开关类变量相互独立，可只填其一。

## 已知问题与排查

### `@edgeone/astro` 与 Astro 版本兼容性

- **历史**：`@edgeone/astro@1.1.5` 只支持 Astro 5 / 6（peer `^5.0.0 || ^6.0.0`），**不支持 Astro 7**。在 Astro 7 下部署会报 `502: CLOUD_FUNCTION_INVOCATION_FAILED`，根因是 Astro 7 生成的 SSR 入口 `entry.mjs` 的 `default` 为 `undefined`（产物为 `createExports` 形态），而 `@edgeone/astro` 的 `handler.js` 固定 `import('entry.mjs').default` 后调用 → 崩溃。
- **曾用方案**：降级到 Astro 6.4.8（`@astrojs/cloudflare` 13.x、`@astrojs/node` 10.x）可让 EdgeOne 正常构建部署。
- **当前方案（已应用）**：升级回 **Astro 7.2.1**，`@astrojs/cloudflare` 14.2.1、`@astrojs/node` 11.1.1，并新增 `@astrojs/netlify` 8.2.1。EdgeOne 适配器保留但暂不可用，等待官方支持 Astro 7。

### EdgeOne 构建环境 Node 版本

- Astro 7 要求 Node ≥ 22.12，EdgeOne 构建环境的 `nodeVersion` **不能设为 `22.11.0`**，应使用预装版本 `22.17.1` / `22.21.1` / `24.11.0` 等。
- EdgeOne 的 `outputDirectory` 必须指向 `.edgeone`（`@edgeone/astro` 适配器的产物目录），不是 `dist`。

### 其他注意事项

- `works.ts`（`/api/works`）使用了 `node:fs` / `node:path`，读取失败会自动回退到构建时快照；Cloudflare 需要 `nodejs_compat`（已配置）。
- 环境变量在**构建时**内联（Astro 非 `PUBLIC_` 变量为构建时读取），改环境变量后必须重新构建部署。
