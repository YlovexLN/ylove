# YLOVEXLN 个人主页

基于 **Astro 7** 的现代化个人主页，使用 **React 19** 构建交互组件、**TailwindCSS 4** 实现样式，支持双主题切换、B站头像与直播状态展示、Markdown / Strapi 双数据源。

## ✨ 功能特性

- 🎨 **双主题系统** — MiniMal（纯黑极简）/ EndField（工业科技感），自动记忆选择
- ⌨️ **Hero 打字机标题** — 多标题轮播，速度可调
- 🐾 **B站集成** — 头像自动获取、直播状态实时检测（`/api/bili-api`）
- 🔗 **社交链接** — 支持 Font Awesome 图标 / 自定义 SVG Logo，可一键关闭图标
- 📄 **双数据源** — `markdown`（本地预写内容）或 `strapi`（构建时拉取 CMS）
- 📦 **模块化页面** — Works / Posts / Profile / Repository / Contact 按需开关
- 🧩 **Islands 架构** — 交互组件按需加载，其余保持纯静态

## 🛠️ 技术栈

| 类别 | 技术选型 |
|------|---------|
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

本项目为 SSR 模式（含 `/api/bili-api` 运行时接口），可直接部署到 **Cloudflare Workers** 或 **腾讯云 EdgeOne**。

> 💡 无需修改 `astro.config.mjs`：构建时通过环境变量 `DEPLOY_TARGET`（`cloudflare` / `edgeone` / `node`）自动选择适配器，对应脚本见下方。

### 部署到 Cloudflare Workers

项目已内置 `@astrojs/cloudflare`，使用 `pnpm build:cloudflare` 即可生成 Worker 产物（`dist/client` 静态资源 + `dist/server` Worker 入口，并自动生成 `dist/server/wrangler.json`）。

1. **本地预览**：

   ```sh
   pnpm build:cloudflare
   pnpm exec wrangler dev -c dist/server/wrangler.json
   ```

2. **部署**：

   ```sh
   pnpm exec wrangler deploy -c dist/server/wrangler.json
   ```

   > 也可 `cd dist/server && pnpm exec wrangler deploy`。

3. **环境变量**：如需用环境变量覆盖配置，见下方「环境变量」章节。

> 构建参数通过项目根 `wrangler.jsonc` 配置（名称、`compatibility_date`、`nodejs_compat` 等），构建时自动合并到 `dist/server/wrangler.json`。也可在 Cloudflare 控制台通过 **Workers Builds** 连接 Git 仓库自动构建部署（构建命令 `pnpm build:cloudflare`，部署命令 `pnpm exec wrangler deploy -c dist/server/wrangler.json`）。

### 部署到腾讯云 EdgeOne（Git 连接仓库）

EdgeOne Makers 支持连接 GitHub / GitLab / Bitbucket / Gitee 仓库，推送提交后自动构建部署。项目已内置 `@edgeone/astro`，无需修改 `astro.config.mjs`。

1. **创建 `edgeone.json`**（可选，也可在控制台构建配置中填写）：

   ```json
   {
     "name": "ylove",
     "installCommand": "pnpm install",
     "buildCommand": "pnpm build:edgeone",
     "outputDirectory": ".edgeone",
     "nodeVersion": "22.11.0"
   }
   ```

   > `@edgeone/astro` 默认将构建产物输出到 `.edgeone/` 目录，`pnpm build:edgeone` 等价于 `cross-env DEPLOY_TARGET=edgeone astro build`。

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

**Cloudflare Workers** 与 **EdgeOne** 均支持用环境变量覆盖 `config.toml` 中的配置，免改代码（构建时读取，修改后需重新构建部署）。

| 变量 | 说明 |
|------|------|
| `DEPLOY_TARGET` | 构建目标：`node` / `cloudflare` / `edgeone`（构建脚本已自动设置） |
| `PAGE_MODE` | 页面模式：`single` / `scroll`（覆盖 `config.toml` 的 `mode`） |
| `BILIBILI_UID` | B站 UID（覆盖 `config.toml` 的 `bilibili_uid`，用于头像自动获取） |
| `STRAPI_URL` / `STRAPI_TOKEN` | Strapi 数据源地址与 Token（`content_source = "strapi"` 时使用） |
| `FOOTER_SHOW` | 页脚底部信息整行开关：`true` / `false` |
| `FOOTER_ICP_SHOW` | 备案号单独开关：`false` 只隐藏备案号（默认 `false`，需配置了 `[footer.icp]`） |

> 页脚底部信息的内容（CDN / Host 等 `[[footer.items]]`、备案号 `[footer.icp]`）在 `config.toml` 中配置；环境变量仅用于控制显示开关。优先级：环境变量 > `config.toml`。`FOOTER_SHOW` 与 `FOOTER_ICP_SHOW` 相互独立，可只填其一。备案号用 `FOOTER_ICP_SHOW` 单独控制，不影响 CDN / Host。

**Cloudflare Workers** 设置方式：

- **Workers Builds（Git 连接）**：控制台 `Workers & Pages` → 项目 → `Settings` → `Variables and Secrets`
- **本地 wrangler**：构建时注入开关变量（如 PowerShell：`$env:FOOTER_SHOW='false'`），或写入 `wrangler.jsonc` 的 `vars`；敏感值用 `pnpm exec wrangler secret put STRAPI_TOKEN`

**EdgeOne** 设置方式：

- 控制台 `项目设置 → 环境变量` 中添加变量与值，保存后 Redeploy 生效

## 🤝 贡献者

- **YlovexLN** — 项目作者与维护者
- **GitHub Copilot** — AI 编程助手，参与功能开发、多平台部署配置与文档编写

> 本项目使用 [GitHub Copilot](https://github.com/features/copilot) 辅助开发。

## 📖 相关文档

- [Astro 官方文档](https://docs.astro.build)
- [Astro 部署到 Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [EdgeOne Astro 框架指南](https://pages.edgeone.ai/document/framework-astro)
- [EdgeOne 导入 Git 仓库](https://pages.edgeone.ai/document/importing-a-git-repository)
- [EdgeOne `edgeone.json` 配置](https://pages.edgeone.ai/document/edgeone-json)
