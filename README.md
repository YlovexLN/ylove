# YLOVEXLN 个人主页

基于 Astro 7 的个人主页与作品集：极简纯黑主题、翡翠绿强调，静态页 + SSR API，支持 B站头像与直播状态、Markdown / Strapi 双数据源、多目标部署。

## ✨ 特性

- 🎨 **极简主题** — 纯黑底 + 网格渐变背景，翡翠绿强调，无主题切换
- ⌨️ **Hero 打字机标题** — 多标题轮播，速度可配
- 🐾 **B站集成** — 头像与直播状态经本站 `/api/bili-api` 服务端代理（规避风控、带缓存、失败回退静态头像）
- 🔗 **社交链接** — Font Awesome 图标或自定义 Logo，可整体隐藏图标
- 📄 **双数据源** — `markdown`（本地预写）或 `strapi`（构建时拉取 CMS）
- 📦 **模块化页面** — Profile / Works / Posts / Repository / Contact 按需开关
- 🧩 **Islands 架构** — 仅交互组件水合，其余为纯静态 HTML

## 🛠️ 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Astro 7（静态页 + SSR API） |
| 交互组件 | Preact 10（React compat 写法）+ shadcn/ui |
| 样式 | TailwindCSS 4（CSS-first） |
| 图标 | Font Awesome 7 图标数据（内联 SVG） |
| 字体 | 寒蝉全圆体（CDN 分片加载） |
| 配置 | TOML（`smol-toml` 解析 `config.toml`） |
| 包管理 | pnpm |

## 🚀 本地开发

```sh
pnpm install     # 安装依赖
pnpm dev         # 开发服务器 http://localhost:4321
pnpm build       # 构建生产产物到 dist/
pnpm preview     # 预览构建结果
```

## ⚙️ 配置

站点内容全部写在根目录 `config.toml`，无需改代码（完整示例见 `config.example.toml`）：

- **基本信息** — 站点名 / Logo / B站 UID / 头像 / 轮播标题 / 打字机速度
- **页面模式** `mode` — `single` 单页 / `scroll` 滚动多模块
- **模块开关** `[modules]` — 控制各主页模块显隐
- **社交链接** `[[socials]]` — 自由增删，可用 FA 图标或自定义 Logo
- **数据源** `content_source` — `markdown`（默认）或 `strapi`
- **页脚 / 赞助** — `[footer]`、`[sponsor]` 开关与内容

## 📁 目录结构

```text
src/
├── components/
│   ├── react/       # 交互组件（Hero、Navbar、Footer 等）
│   └── ui/          # shadcn/ui 基础组件
├── content/         # Markdown 内容（posts / works）
├── data/            # 数据与 config.toml 解析
├── hooks/           # 自定义 hooks
├── interfaces/      # 类型定义
├── layouts/         # Layout.astro（全局背景 / 字体 / 元信息）
├── lib/             # Strapi 客户端、作品解析
├── pages/           # 路由（index / sponsor / api）
├── styles/          # global.css（主题变量、网格渐变背景）
└── utils/           # 工具函数
```

## ☁️ 部署

适配器由 `DEPLOY_TARGET` 环境变量自动选择，无需改 `astro.config.mjs`：

| 目标 | 命令 | 产物 |
| --- | --- | --- |
| Node（默认） | `pnpm build` | `dist/` |
| Cloudflare | `pnpm build:cloudflare` | `dist/client` + `dist/server` |
| Netlify | `pnpm build:netlify` | `dist/` + `.netlify/` |
| ESA | `pnpm build:esa` | `dist/`（静态托管 + 边缘函数） |
| EdgeOne | `pnpm build:edgeone` | `.edgeone/`（待官方适配 Astro 7） |

环境变量（`BILIBILI_UID`、`STRAPI_URL`、`FOOTER_SHOW` 等）可在平台控制台配置，构建时读取并覆盖 `config.toml`，改后需重新构建。

完整步骤、平台配置与排障见 [docs/deploy.md](docs/deploy.md)。

## 📖 文档

- [文档索引](docs/README.md) — 部署指南等运维文档
- [部署指南](docs/deploy.md) — 各目标构建、环境变量、已知问题
- [项目上下文](.agents/context/) — 产品需求 / 技术架构 / 约束约定
- [Astro 官方文档](https://docs.astro.build)

## 🤝 贡献者

- **YlovexLN** — 作者与维护者
- **GitHub Copilot** — AI 编程助手，参与功能开发、部署配置与文档
- **DeepSeek Harness**（`deepseek-v4.1-flash` 模型）— AI 编程助手，参与背景视觉调整、代码与文档整理

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

