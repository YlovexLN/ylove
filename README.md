# YLOVEXLN 个人主页

基于 **Astro 7** 的现代化个人主页，使用 **React 19** 构建交互组件、**TailwindCSS 4** 实现样式，支持 B站头像与直播状态展示、Markdown / Strapi 双数据源。

## ✨ 功能特性

- 🎨 **极简主题** — 纯黑极简风格，翡翠绿强调
- ⌨️ **Hero 打字机标题** — 多标题轮播，速度可调
- 🐾 **B站集成** — 头像自动获取、直播状态实时检测；经本站服务端 `/api/bili-api` 代理（携带 buvid3 cookie 规避数据中心 IP 风控、Referer/UA 可控、带缓存），SSR 走 Astro API 路由、纯静态部署走 ESA 边缘函数兜底，头像失败回退内置静态头像不裂图
- 🔗 **社交链接** — 支持 Font Awesome 图标 / 自定义 SVG Logo，可一键关闭图标
- 📄 **双数据源** — `markdown`（本地预写内容）或 `strapi`（构建时拉取 CMS）
- 📦 **模块化页面** — Works / Posts / Profile / Repository / Contact 按需开关
- 🧩 **Islands 架构** — 交互组件按需加载，其余保持纯静态

## 🛠️ 技术栈

| 类别 | 技术选型 |
| ------ | --------- |
| 框架 | Astro 7（Islands 架构，SSR 模式） |
| UI 组件 | React 19 + shadcn/ui |
| 样式 | TailwindCSS 4（CSS-first） |
| 图标 | Font Awesome 7（品牌 + 实心） |
| 配置 | TOML（smol-toml 解析 `config.toml`） |
| 包管理 | pnpm |

## 📁 目录结构

```text
/
├── public/              # 静态资源（头像、字体、作品图）
├── src/
│   ├── components/
│   │   ├── react/       # React 交互组件（Hero、Navbar、Footer 等）
│   │   └── ui/          # shadcn/ui 基础组件
│   ├── content/         # Markdown 内容（posts / works）
│   ├── data/            # 数据文件与 config.toml 解析
│   ├── layouts/         # 页面布局
│   ├── lib/             # 工具库（Strapi 客户端、作品解析）
│   ├── pages/           # 页面路由
│   │   └── api/         # 服务端 API（B站代理等）
│   ├── styles/          # 全局样式与字体
│   └── utils/           # 工具函数
├── config.toml          # ⚙️ 站点配置（修改此处更新页面内容）
├── config.example.toml  # 配置模板
├── astro.config.mjs
└── package.json
```

## 🚀 本地开发

```sh
pnpm install     # 安装依赖
pnpm dev         # 启动开发服务器 http://localhost:4321
pnpm build       # 构建生产产物到 ./dist/
pnpm preview     # 本地预览构建结果
```

## ⚙️ 配置说明

所有页面内容均通过根目录的 `config.toml` 配置，无需修改代码：

- **基本信息** — 站点名、Logo、B站 UID、头像、轮播标题、打字机速度
- **模块开关** `[modules]` — 控制 Works / Posts 等模块显隐
- **社交链接** `[[socials]]` — 自由增删，支持 Font Awesome 图标与自定义 Logo
- **数据源** `content_source` — `markdown`（默认）或 `strapi`

> 完整示例见 `config.example.toml`。

## ☁️ 部署

本项目为 SSR 模式（含 `/api/bili-api` 运行时接口），可直接部署到 **Cloudflare Workers**、**Netlify**、**Vercel** 或 **腾讯云 EdgeOne**。B站头像与直播检测统一走本站 `/api/bili-api` **服务端代理**：服务端先向 B站首页发起一次握手，获取 B站下发给任意匿名访客的 `buvid3` cookie，再携带该 cookie + 完整浏览器 UA + 匹配 Referer 请求 B站接口，有效规避数据中心出口 IP 被风控（-352/-412）。SSR 部署命中 `src/pages/api/bili-api.ts`，ESA 纯静态部署命中 `esa/functions/bili-api.ts` 边缘函数。头像直接取自 `x/web-interface/card` 的 `data.card.face` 再代理回源，另有内置静态头像兜底（失败 onError 回退不裂图）、1 小时缓存；直播状态（card 接口不含 live 信息）单独经直播间接口查询，带 5 分钟缓存限频。

> ⚠️ 请勿改回「浏览器 JSONP 直连 B站」：`<script>` 跨域加载时 `Referer` 是本站域名，B站对陌生第三方 Referer + `jsonp callback` 的风控会直接返回 **403**。

> 💡 无需修改 `astro.config.mjs`：构建时通过环境变量 `DEPLOY_TARGET`（`cloudflare` / `netlify` / `vercel` / `node`，`edgeone` 待官方适配 Astro 7）自动选择适配器，对应脚本见下方。

### 部署到 Cloudflare Workers

项目已内置 `@astrojs/cloudflare`，使用 `pnpm build:cloudflare` 即可生成 Worker 产物（`dist/client` 静态资源 + `dist/server` Worker 入口，并自动生成 `dist/server/wrangler.json`）。

1. **本地预览**：

   ```sh
   pnpm build:cloudflare
   pnpm exec wrangler dev -c dist/server/wrangler.json
   ```

2. **部署**：

   ```sh
   pnpm deploy:cloudflare
   ```

   > 即 `wrangler deploy -c dist/server/wrangler.json`（脚本已内置该参数）；也可 `cd dist/server && pnpm exec wrangler deploy`。

3. **Workers Builds（控制台自动构建部署）**：控制台 `Workers & Pages` → **Create → Worker → Connect to Git repository** 选择本仓库，构建配置填写：

   - **构建命令**：`pnpm build:cloudflare`
   - **部署命令**：`pnpm deploy:cloudflare`

   > ⚠️ 部署命令用 `deploy:cloudflare` 脚本，内部已带 `-c dist/server/wrangler.json`（Worker 入口与静态资源目录都由这份构建产物自动生成的配置指定）；不要裸用 `wrangler deploy`——那会读仓库根 `wrangler.jsonc`（无入口文件，部署失败或得到空 Worker）。该文件构建时自动合并根 `wrangler.jsonc` 的 `vars` 等配置。

4. **环境变量**：如需用环境变量覆盖配置，见下方「环境变量」章节。

> `wrangler` 已加入 `devDependencies`（`@astrojs/cloudflare` 的 peer 依赖，pnpm 不会自动安装，否则 `pnpm exec wrangler` 会报 `Command "wrangler" not found`）。构建参数通过项目根 `wrangler.jsonc` 配置（名称、`compatibility_date`、`nodejs_compat` 等），构建时自动合并到 `dist/server/wrangler.json`。

### 部署到 Netlify

项目已内置 `@astrojs/netlify`，使用 `pnpm build:netlify` 即可生成产物（`dist/` 静态资源 + `.netlify/` SSR 函数）。

1. **本地预览**：

   ```sh
   pnpm build:netlify
   pnpm exec netlify dev
   ```

2. **推送到 Git 仓库**，然后在 [Netlify 控制台](https://app.netlify.com) 点击 **Add a new site → Import an existing project**，选择你的仓库。

   > 根目录的 `netlify.toml` 已配置好构建命令（`pnpm build:netlify`）与发布目录（`dist`），Netlify 会自动读取；Node 版本通过 `.nvmrc`（24）固定。

3. **环境变量**：如需用环境变量覆盖配置，在 Netlify 项目 `Site configuration → Environment variables` 中添加，见下方「环境变量」章节。

### 部署到 Vercel

项目已内置 `@astrojs/vercel`，使用 `pnpm build:vercel` 即可生成 Vercel SSR 产物（`.vercel/output/`，遵循 Vercel Build Output API，页面与 `/api/bili-api` 等路由自动打包为 `_render` 函数）。

1. **本地构建/预览**：

   ```sh
   pnpm build:vercel
   # 输出 .vercel/output，可在本地用 vercel dev 预览（需安装 vercel CLI）
   ```

   > `build:vercel` 已通过 `cross-env` 内联 `DEPLOY_TARGET=vercel`，并把页面模式、B站 UID 与页脚平台标识（`FOOTER_ITEMS`：CDN - Vercel Edge / HOST - Vercel）等覆盖写进脚本，无需在 Vercel 再逐个配置即可按 Vercel 品牌渲染。

2. **推送到 Git 仓库**，在 [Vercel 控制台](https://vercel.com) 点击 **Add New → Project → Import** 选择本仓库，`Framework Preset` 选 **Astro**（也可自动识别）。

   > 根目录的 `vercel.json` 已配置好构建命令（`pnpm build:vercel`）；`@astrojs/vercel` 经 `.vercel/output` 的 Build Output API 自动构建部署，Node 版本满足 Astro 7 要求（≥ 22.12）。

3. **环境变量（可选）**：`build:vercel` 已内置常用覆盖项。如需再覆盖（如切换 `PAGE_MODE`、关闭页脚/赞助等），在 Vercel 项目 `Settings → Environment Variables` 中添加（Vercel 不支持把环境变量写进 `vercel.json`），见下方「环境变量」章节。

### 部署到腾讯云 EdgeOne（待适配 Astro 7）

EdgeOne Makers 支持连接 GitHub / GitLab / Bitbucket / Gitee 仓库，推送提交后自动构建部署。项目已内置 `@edgeone/astro`，无需修改 `astro.config.mjs`。

> ⚠️ **当前状态**：`@edgeone/astro@1.1.5` 仅支持 Astro 5/6，**尚未适配 Astro 7**。本仓库已升级到 Astro 7，故暂时无法用 EdgeOne 构建部署（`pnpm build:edgeone` 会失败）。等待官方发布支持 Astro 7 的新版本后，移除 `astro.config.mjs` 中的适配器即可恢复使用。

1. **创建 `edgeone.json`**（可选，也可在控制台构建配置中填写）：

   ```json
   {
     "name": "ylove",
     "installCommand": "pnpm install",
     "buildCommand": "pnpm build:edgeone",
     "outputDirectory": ".edgeone",
     "nodeVersion": "24.11.0"
   }
   ```

   > `@edgeone/astro` 默认将构建产物输出到 `.edgeone/` 目录，`pnpm build:edgeone` 等价于 `cross-env DEPLOY_TARGET=edgeone astro build`。注意：Astro 7 要求 Node ≥ 22.12，EdgeOne 构建环境的 `nodeVersion` 需设为 `22.17.1` / `22.21.1` / `24.11.0` 等满足要求的预装版本（勿用 `22.11.0`）。

2. **推送到 Git 仓库**：将代码推送到 GitHub / GitLab / Gitee 等平台。

3. **控制台导入仓库**：
   - 登录 [EdgeOne Makers 控制台](https://console.tencentcloud.com/edgeone/makers)
   - 绑定 GitHub（授权 EdgeOne 访问你的仓库）
   - 选择要部署的仓库
   - 确认构建配置（构建命令 `pnpm build:edgeone`、输出目录 `.edgeone`），选择加速区域
   - 点击「开始部署」

4. **自动更新**：之后每次推送到部署分支，EdgeOne 会自动拉取并重新构建部署。

5. **环境变量**：如需用环境变量覆盖配置（`STRAPI_URL` / `FOOTER_SHOW` / `FOOTER_ICP_SHOW` 等），见下方「环境变量」章节。

> 也可使用 CLI 部署：`npm install -g edgeone && edgeone login`，然后执行 `pnpm build:edgeone && edgeone makers deploy`。EdgeOne 运行时为 Node.js 22+，与本项目要求一致。

### 环境变量（覆盖配置文件）

**Cloudflare Workers**、**Netlify**、**Vercel** 与 **EdgeOne** 均支持用环境变量覆盖 `config.toml` 中的配置，免改代码（构建时读取，修改后需重新构建部署）。

| 变量 | 说明 |
| ------ | ------ |
| `DEPLOY_TARGET` | 构建目标：`node` / `cloudflare` / `netlify` / `vercel` / `edgeone`（构建脚本已自动设置） |
| `PAGE_MODE` | 页面模式：`single` / `scroll`（覆盖 `config.toml` 的 `mode`） |
| `BILIBILI_UID` | B站 UID（覆盖 `config.toml` 的 `bilibili_uid`，用于头像自动获取） |
| `STRAPI_URL` / `STRAPI_TOKEN` | Strapi 数据源地址与 Token（`content_source = "strapi"` 时使用） |
| `FOOTER_SHOW` | 页脚底部信息整行开关：`true` / `false` |
| `FOOTER_ICP_SHOW` | 备案号单独开关：`false` 只隐藏备案号（默认 `false`，需配置了 `[footer.icp]`） |
| `FOOTER_ITEMS` | 页脚项内容覆盖：JSON 对象（`{"CDN - ": {"text": "...", "url": "..."}}`，键为 label）或数组形式，构建时替换 `[[footer.items]]`；未设置或格式无效则用 config.toml |

> 页脚底部信息的内容（CDN / Host 等 `[[footer.items]]`、备案号 `[footer.icp]`）默认在 `config.toml` 中配置，`FOOTER_ITEMS` 环境变量可整体覆盖页脚项内容，其余环境变量控制显示开关。优先级：环境变量 > `config.toml`。`FOOTER_SHOW` 与 `FOOTER_ICP_SHOW` 相互独立，可只填其一。备案号用 `FOOTER_ICP_SHOW` 单独控制，不影响 CDN / Host。

**Cloudflare Workers** 设置方式：

- **Workers Builds（Git 连接）**：变量写在根目录 `wrangler.jsonc` 的 `vars`（或控制台 `Workers & Pages` → 项目 → `Settings` → `Variables and Secrets`），平台构建时会注入构建环境
- **本地 wrangler**：变量需在构建命令前注入 shell（如 PowerShell：`$env:FOOTER_SHOW='false'`）或写入根目录 `.env`（本地 `astro build` 不会读取 `wrangler.jsonc` 的 `vars`）；`DEPLOY_TARGET` 由构建脚本自动设置

> ⚠️ 本项目通过 `import.meta.env.*` 在**构建时**读取这些变量（构建产物已静态注入，值须为字符串），修改后需重新构建部署。敏感值（如 `STRAPI_TOKEN`）请用控制台 `Variables and Secrets` 配置，勿写入仓库内的 `wrangler.jsonc`。

**Netlify** 设置方式：项目 `Site configuration → Environment variables` 中添加变量与值，重新 Deploy 生效。

**Vercel** 设置方式：`build:vercel` 已内置常用覆盖项；如需再覆盖，在 Vercel 项目 `Settings → Environment Variables` 中添加变量与值，重新 Deploy 生效（Vercel 不支持把环境变量写入 `vercel.json`）。

**EdgeOne** 设置方式：

- 控制台 `项目设置 → 环境变量` 中添加变量与值，保存后 Redeploy 生效

## 🤝 贡献者

- **YlovexLN** — 项目作者与维护者
- **GitHub Copilot** — AI 编程助手，参与功能开发、多平台部署配置与文档编写

> 本项目使用 [GitHub Copilot](https://github.com/features/copilot) 辅助开发。

## 📖 相关文档

- [Astro 官方文档](https://docs.astro.build)
- [Astro 部署到 Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Astro 部署到 Netlify](https://docs.astro.build/en/guides/deploy/netlify/)
- [EdgeOne Astro 框架指南](https://pages.edgeone.ai/document/framework-astro)
- [EdgeOne 导入 Git 仓库](https://pages.edgeone.ai/document/importing-a-git-repository)
- [EdgeOne `edgeone.json` 配置](https://pages.edgeone.ai/document/edgeone-json)
