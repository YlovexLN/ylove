import fs from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";
import { filterValidWorks, parseWorkMd } from "@/lib/work-parser";
import workMdRaw from "@/content/works/work.md?raw";

// 实时内容接口：读取 work.md 并返回解析后的有效记录列表
// 优先运行时 fs 读取（捕获文件最新变更）；fs 不可用（如生产无源码目录）时回退到构建时内容
export const GET: APIRoute = () => {
  let raw = workMdRaw;
  try {
    const file = path.resolve(process.cwd(), "src/content/works/work.md");
    raw = fs.readFileSync(file, "utf-8");
  } catch {
    // 读取失败时使用构建时快照
  }

  const works = filterValidWorks(parseWorkMd(raw));
  return new Response(JSON.stringify(works), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
