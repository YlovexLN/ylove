## 开发

启动开发服务器时，使用后台模式：

```
pnpm astro dev --background
```

通过 `pnpm astro dev stop`、`pnpm astro dev status` 和 `pnpm astro dev logs` 管理后台服务器。

## 工作流程

- **验证成果后清理临时产物** — 功能验证结束后，清理验证过程中生成的、仅使用一次且与最终成果无关的代码、脚本、缓存、调试文件等临时产物，保持工作区干净

## CSS 规范

编写样式时遵循以下优先级：

1. **TailwindCSS 工具类优先** — 所有静态样式一律使用 Tailwind 类，包括布局（flex/grid）、间距（p/m）、颜色（text-/bg-）、字体（font-）、尺寸（w-/h-）、动画（transition-/animate-）等
2. **仅以下情况使用内联 `style`**：
   - 动态计算值：`height: \`$\{progress}%\``
   - 三元表达式：`fontSize: expanded ? 18 : 9`
   - CSS 变量引用：`fontFamily: "var(--font-display)"`
3. **避免自定义 CSS** — 有 Tailwind 工具类可表达的就不要写 `@apply` 或手写 CSS
4. **状态样式用 Tailwind 变体** — 优先 `hover:`、`group-hover:` 等变体，而非 onMouseEnter/Leave 改内联 style

## 组件规范

- **优先使用 shadcn/ui 组件** — 按钮用 `Button`、输入框用 `Input`、标签用 `Badge`、卡片用 `Card` 等。不复用造轮子，需要新 UI 组件时先检查 `src/components/ui/` 是否已有，没有则用 shadcn CLI 生成
- **图标优先使用 Font Awesome** — 从 `@fortawesome/react-fontawesome` 导入组件，搭配 `@fortawesome/free-brands-svg-icons`（品牌图标）或 `@fortawesome/free-solid-svg-icons`（实心图标）使用

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
