import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// 注意：works 内容已改为由 work.md（自定义解析器 src/lib/work-parser.ts）驱动，
// 不再使用 content collection，避免与多记录格式冲突。
const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "src/content/posts" }),
  schema: z.object({
    date: z.string(),
    title: z.string(),
    summary: z.string(),
    url: z.string().optional(),
  }),
});

export const collections = { posts };
