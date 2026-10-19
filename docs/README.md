# 项目文档

YLOVEXLN 个人主页的文档索引。日常改配置先看根目录 [README.md](../README.md)，AI 协作规范见 [AGENTS.md](../AGENTS.md)。

| 文档 | 位置 | 内容 |
| --- | --- | --- |
| 产品需求（PRD） | [`.agents/context/prd.md`](../.agents/context/prd.md) | 产品定位、功能模块、页面清单、交互流程、视觉与响应式要求 |
| 技术架构 | [`.agents/context/architecture.md`](../.agents/context/architecture.md) | 技术选型、目录结构、路由与 API、数据模型、设计令牌、约束与约定 |
| 部署指南 | [`deploy.md`](deploy.md) | Node / Cloudflare / Netlify / EdgeOne / ESA 的构建部署、环境变量、排障 |

## 常见入口

| 想改什么 | 去哪里 |
| --- | --- |
| 站点内容（名称、头像、社交链接、模块开关、赞助页、页脚） | 根目录 `config.toml` |
| 首页模块结构 | `src/pages/index.astro` |
| 交互组件 | `src/components/react/` |
| 基础 UI / 图标 | `src/components/ui/`（`Button`、`Card`、`Icon` 等） |
| 主题色与字体令牌 | `src/styles/global.css` 的 `@theme` |
| 构建 / 部署命令 | `package.json` scripts + [部署指南](deploy.md) |

> 项目上下文（PRD / 技术架构）位于 [`.agents/context/`](../.agents/context/)，本目录只保留部署与运维文档。
