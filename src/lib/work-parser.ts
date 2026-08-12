// work.md 结构化解析与校验工具（服务端/客户端共用，无 Node 依赖）

export interface WorkRecord {
  /** 稳定键：按 work.md 中记录出现顺序生成，用于卡片 diff/排序 */
  id: string;
  title: string;
  description: string;
  url?: string;
  /** 卡片封面图：来自 `图片：` 字段行，或正文中的 markdown `![描述](地址)` / HTML `<img src="...">` */
  image?: string;
  tags: string[];
  /** 正文（字段行与图片语法以外的非空文本） */
  body?: string;
}

// markdown 图片语法：![alt](src)
const IMG_INLINE_RE = /!\[[^\]]*\]\(([^)]*)\)/;
// HTML img 标签：<img ... src="..." ... />（GitHub 粘贴图片常插入此格式）
const IMG_HTML_RE = /<\s*img\b[^>]*\bsrc\s*=\s*["']?([^"'\s>]+)["']?[^>]*>/gi;

/**
 * 图片地址规范化：
 * - `data:`、`http(s):`、`/` 开头的绝对路径直接使用；
 * - 其余相对路径（如粘贴产生的 `./xxx.png`）统一按 public/works/ 目录解析。
 */
function normalizeImageSrc(src: string): string {
  const trimmed = src.trim();
  if (/^(data:|https?:|\/)/i.test(trimmed)) return trimmed;
  return `/works/${trimmed.replace(/^\.\//, "")}`;
}

/**
 * 解析 work.md 中的多条记录。
 * 格式约定：每条记录以 `## 标题` 开头，其后为字段行与可选正文，记录间按出现顺序排列。
 * 支持字段：描述/description、链接/link/url、图片/image/封面、标签/tags（分隔符支持中英文逗号/顿号）。
 * 正文中可直接粘贴图片：markdown 语法 `![描述](地址)` 或 HTML `<img src="...">` 均可，
 * 会自动提取为卡片封面并从正文中移除；`图片：` 字段行的优先级高于正文图片。
 * `##` 之前的说明性文本会被忽略。
 */
export function parseWorkMd(raw: string): WorkRecord[] {
  // 按 "## " 标题切分：sections[0] 为文档头部说明（忽略）
  const sections = raw.split(/^##\s+/m);
  const records: WorkRecord[] = [];

  for (let i = 1; i < sections.length; i++) {
    const lines = sections[i].split(/\r?\n/);
    const title = (lines.shift() ?? "").trim();
    if (!title) continue;

    let description = "";
    let url: string | undefined;
    let image: string | undefined;
    const tags: string[] = [];
    const bodyLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const descMatch = /^(?:描述|description)\s*[:：]\s*(.+)$/i.exec(trimmed);
      const urlMatch = /^(?:链接|link|url)\s*[:：]\s*(.+)$/i.exec(trimmed);
      const imageMatch = /^(?:图片|image|封面)\s*[:：]\s*(.+)$/i.exec(trimmed);
      const tagsMatch = /^(?:标签|tags)\s*[:：]\s*(.+)$/i.exec(trimmed);

      if (descMatch) {
        description = descMatch[1].trim();
      } else if (urlMatch) {
        url = urlMatch[1].trim();
      } else if (imageMatch) {
        image = imageMatch[1].trim();
      } else if (tagsMatch) {
        tagsMatch[1]
          .split(/[,，、]+/)
          .map((t) => t.trim())
          .filter(Boolean)
          .forEach((t) => tags.push(t));
      } else {
        // 正文：识别 markdown 图片 `![alt](src)` 或 HTML `<img src="...">`，提取为封面并从正文移除
        let rest = trimmed;
        const inlineImg = IMG_INLINE_RE.exec(trimmed);
        if (inlineImg) {
          if (!image) image = normalizeImageSrc(inlineImg[1]);
          rest = rest.replace(IMG_INLINE_RE, "").trim();
        }
        const htmlImg = IMG_HTML_RE.exec(rest);
        if (htmlImg) {
          if (!image) image = normalizeImageSrc(htmlImg[1]);
          rest = rest.replace(IMG_HTML_RE, "").trim();
        }
        if (rest) bodyLines.push(rest);
      }
    }

    records.push({
      id: String(i - 1),
      title,
      description,
      url: url || undefined,
      image: image || undefined,
      tags,
      body: bodyLines.join("\n") || undefined,
    });
  }

  return records;
}

/**
 * 记录有效性校验：过滤格式不完整的记录，避免渲染异常卡片。
 * 要求：标题与描述非空；若存在链接则必须是可跳转的 http(s) 地址。
 */
export function isValidWork(work: WorkRecord): boolean {
  if (!work.title || !work.description) return false;
  if (work.url !== undefined && !/^https?:\/\/[^\s]+$/i.test(work.url)) return false;
  return true;
}

/** 过滤出全部有效记录（保持原顺序） */
export function filterValidWorks(works: WorkRecord[]): WorkRecord[] {
  return works.filter(isValidWork);
}
