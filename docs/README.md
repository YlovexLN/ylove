# 项目文档

YLOVEXLN 个人主页的文档索引。日常改配置先看根目录 [README.md](../README.md)，AI 协作规范见 [AGENTS.md](../AGENTS.md)。

| 文档 | 内容 |
| --- | --- |
| [产品需求（PRD）](prd.md) | 产品定位、功能模块、页面清单、交互流程、视觉与响应式要求 |
| [技术架构](architecture.md) | 技术选型、目录结构、路由与 API、数据模型、设计令牌、约束与约定 |
| [部署指南](deploy.md) | Node / Cloudflare / Netlify / EdgeOne / ESA 的构建部署、环境变量、排障 |

## 常见入口

| 想改什么 | 去哪里 |
| --- | --- |
| 站点内容（名称、头像、社交链接、模块开关、赞助页、页脚） | 根目录 `config.toml` |
| 首页模块结构 | `src/pages/index.astro` |
| 交互组件 | `src/components/react/` |
| 基础 UI / 图标 | `src/components/ui/`（`Button`、`Card`、`Icon` 等） |
| 主题色与字体令牌 | `src/styles/global.css` 的 `@theme` |
| 构建 / 部署命令 | `package.json` scripts + [部署指南](deploy.md) |

> 本目录文档由原 `.trae/documents/` 迁移整理，并已按当前实现（Astro 7 + Preact 10 compat、CDN 字体、多目标部署）同步更新。
