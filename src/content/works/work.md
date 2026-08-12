# Work 内容（work.md）

> 使用说明：本文件为 work 模块的唯一内容源。
> 每个作品以 `## 标题` 段落开头，支持字段行：描述/description、链接/link/url、图片/image/封面、标签/tags。
> 插入图片三种方式任选：① 字段行 `图片：/works/文件名`（文件放 public/works/）；② 正文 markdown 语法 `![描述](地址)`；③ 直接粘贴图片产生的 HTML `<img src="...">` 标签（GitHub 编辑器粘贴即此格式），后两种都会自动识别为卡片封面。
> 新增作品时在文末追加新的 `## 段落`，页面卡片会按出现顺序自动追加渲染。
> 缺少标题或描述、链接格式非法的记录会被自动过滤，不会渲染异常卡片。

## 示例项目

<img src="...">
描述：这是一个示例作品。
链接：https://example.com
标签：Astro、React

这里是作品的详细内容。

## 动态卡片渲染

描述：由 work.md 驱动的前端动态卡片组件。
链接：https://example.com/live-cards
标签：React、TailwindCSS、Astro


支持实时监听 work.md 变更，并按序追加渲染新卡片。

## GitHub 粘贴图片测试

描述：验证 GitHub 粘贴图片的 HTML img 格式识别。
标签：GitHub、Markdown

这条记录的封面应识别为 GitHub 外链图片。
