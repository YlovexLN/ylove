# 项目规范

YLOVEXLN 个人主页：**Astro 7 + React 19 + TailwindCSS 4 + Font Awesome 7 + TypeScript** 静态站点，SSR 多目标部署。

- **主题**：单一 MiniMal 极简风格（纯黑背景 + 翡翠绿强调），**无主题切换**
- **字体**：自托管 ChillRoundF（寒蝉全圆体，字重 400/700，`public/fonts/*.ttf`），不使用 Google Fonts CDN
- **配置**：`config.toml` 经 `smol-toml` 解析，支持构建环境变量覆盖
- **内容源**：`markdown`（`src/content/` 预写）或 `strapi`（构建时从 CMS 拉取）

## 开发

开发服务器由**用户手动启动**，AI 不要自行启动（后台重复启动易造成误判启动失败）。

用户启动命令（后台模式）：

```
pnpm astro dev --background
```

后台管理：`pnpm astro dev stop` / `pnpm astro dev status` / `pnpm astro dev logs`

## 构建与部署

适配器由 `DEPLOY_TARGET` 环境变量自动选择：

| 目标         | 命令                    | 产物                              |
| ------------ | ----------------------- | --------------------------------- |
| Node（默认） | `pnpm build`            | `dist/`                           |
| Cloudflare   | `pnpm build:cloudflare` | `dist/client` + `dist/server`     |
| Netlify      | `pnpm build:netlify`    | `dist/` + `.netlify/`             |
| EdgeOne      | `pnpm build:edgeone`    | `.edgeone/`（待官方适配 Astro 7） |

## 项目结构

```
src/
├── components/
│   ├── react/      # React 交互组件（Navbar、Hero、Footer、WorkCards、SponsorContent 等）
│   └── ui/         # shadcn/ui 基础组件（Button、Input、Badge、Card 等）
├── content/        # Markdown 内容（posts / works）
├── data/           # 数据文件 + config.toml 解析（profile、sponsor、timeline 等）
├── layouts/        # Layout.astro（全局布局与字体预加载）
├── lib/            # 工具库（strapi 客户端、work 解析）
├── pages/          # 页面路由 + API
│   ├── index.astro       # 主页（scroll 模式多模块）
│   ├── sponsor.astro     # 赞助页（受总开关控制）
│   └── api/bili-api.ts   # B站 API 代理（头像 / 直播状态）
└── styles/         # global.css + 字体样式
```

## 配置与数据

- 站点内容改 `config.toml` 即可，`src/data/*.ts` 负责解析
- 主页模块由 `[modules]` 开关控制（profile / works / posts / repository / contact）
- 社交链接 `[[socials]]` 支持 `show = false` 单独隐藏；`url = "/sponsor"` 为赞助入口
- 赞助总开关：`show = false` 或环境变量 `SPONSOR_SHOW = "false"` → 隐藏入口，且 `/sponsor` 页面跳回首页（由 `src/data/sponsor.ts` 的 `isSponsorEnabled()` 统一判定）

### 构建环境变量（优先级高于 config.toml，构建时读取，改后需重新构建）

| 变量                              | 说明                                            |
| --------------------------------- | ----------------------------------------------- |
| `DEPLOY_TARGET`                   | 构建目标：node / cloudflare / netlify / edgeone |
| `PAGE_MODE`                       | 页面模式：single / scroll                       |
| `BILIBILI_UID`                    | B站 UID（头像自动获取）                         |
| `FOOTER_SHOW` / `FOOTER_ICP_SHOW` | 页脚整行 / 备案号开关                           |
| `SPONSOR_SHOW`                    | 赞助总开关（false 隐藏入口并禁用 /sponsor）     |
| `STRAPI_URL` / `STRAPI_TOKEN`     | Strapi 数据源                                   |

## 页面与路由

- Astro 中**一个路由 = `src/pages/` 下一个 `.astro` 文件**：主页 `index.astro` → `/`，赞助页 `sponsor.astro` → `/sponsor`
- 非独立页面的内容作为主页模块渲染（由 `[modules]` 控制），**无需单独 `.astro` 文件**
- API 路由：`src/pages/api/bili-api.ts`（`?action=avatar` 头像代理、`?uid=...` 直播状态检测；头像缓存 1 小时、直播检测限 5 分钟/次）

## 样式规范

编写样式时遵循以下优先级：

1. **TailwindCSS 工具类优先** — 所有静态样式一律使用 Tailwind 类，包括布局（flex/grid）、间距（p/m）、颜色（text-/bg-）、字体（font-）、尺寸（w-/h-）、动画（transition-/animate-）等
2. **仅以下情况使用内联 `style`**：
   - 动态计算值：`height: \`${progress}%\``
   - 三元表达式：`fontSize: expanded ? 18 : 9`
   - CSS 变量引用：`fontFamily: "var(--font-display)"`
3. **避免自定义 CSS** — 有 Tailwind 工具类可表达的就不要写 `@apply` 或手写 CSS
4. **状态样式用 Tailwind 变体** — 优先 `hover:`、`group-hover:` 等变体，而非 onMouseEnter/Leave 改内联 style

## 组件规范

- **优先使用 shadcn/ui 组件** — 按钮用 `Button`、输入框用 `Input`、标签用 `Badge`、卡片用 `Card` 等。不复用造轮子，需要新 UI 组件时先检查 `src/components/ui/` 是否已有，没有则用 shadcn CLI 生成
- **图标优先使用 Font Awesome** — 从 `@fortawesome/react-fontawesome` 导入组件，搭配 `@fortawesome/free-brands-svg-icons`（品牌图标）或 `@fortawesome/free-solid-svg-icons`（实心图标）使用

## 工作流程

- **验证成果后清理临时产物** — 功能验证结束后，清理验证过程中生成的、仅使用一次且与最终成果无关的代码、脚本、缓存、调试文件等临时产物，保持工作区干净

## 文档

完整文档：<https://docs.astro.build>

在处理相关任务前，请参考以下指南：

- [添加页面、动态路由或中间件](https://docs.astro.build/en/guides/routing/)
- [使用 Astro 组件](https://docs.astro.build/en/basics/astro-components/)
- [使用 React、Vue、Svelte 或其他框架组件](https://docs.astro.build/en/guides/framework-components/)
- [使用 TailwindCSS](https://tailwind.nodejs.cn/docs/)
- [使用 shadcn/ui](https://www.shadcn-ui.com/docs/)
- [添加或管理内容](https://docs.astro.build/en/guides/content-collections/)
- [添加样式或使用 Tailwind](https://docs.astro.build/en/guides/styling/)
- [支持多语言](https://docs.astro.build/en/guides/internationalization/)
