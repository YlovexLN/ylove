import { parse } from "smol-toml";
import raw from "../../config.toml?raw";

interface RawSocial {
  name: string;
  url: string;
  icon?: string;
  /** 自定义图标图片地址（SVG/PNG），提供时优先于 icon 使用 */
  logo?: string;
}

interface RawFooterItem {
  /** 链接前的文字（如 "CDN - "，可留空） */
  label?: string;
  text: string;
  url: string;
  /** 是否显示该项（false 单独隐藏，默认 true） */
  show?: boolean;
}

interface RawFooter {
  /** 是否显示页脚底部信息整行 */
  show?: boolean;
  items?: RawFooterItem[];
  /** 备案号（独立配置，可用 FOOTER_ICP_SHOW 单独控制） */
  icp?: {
    show?: boolean;
    label?: string;
    text?: string;
    url?: string;
  };
}

interface RawWork {
  title: string;
  description: string;
  url: string;
  tags: string[];
}

interface RawStat {
  label: string;
  value: string;
}

interface RawModules {
  profile?: boolean;
  works?: boolean;
  posts?: boolean;
  repository?: boolean;
  contact?: boolean;
}

interface RawConfig {
  name: string;
  /** 网页标题（浏览器标签页标题，不填则使用 name） */
  site_title?: string;
  logo?: string;
  background_text?: string;
  bilibili_uid?: number;
  avatar: string;
  titles?: string[];
  title?: string;
  typewriter_speed?: number;
  bio: string;
  /** 是否显示社交图标（false 时只显示文字） */
  show_social_icons?: boolean;
  socials: RawSocial[];
  /** 页脚底部信息（CDN / Host / 备案等） */
  footer?: RawFooter;
  mode?: string;
  content_source?: "strapi" | "markdown";
  modules?: RawModules;
  works?: RawWork[];
  stats?: RawStat[];
}

const config = parse(raw) as unknown as RawConfig;

const iconMap: Record<string, string> = {
  github: "github",
  twitter: "twitter",
  linkedin: "linkedin",
  mail: "mail",
};

// 过滤掉 show=false 的项（每项可单独控制显示/隐藏，如备案号）
function filterVisibleItems(items: RawFooterItem[]): RawFooterItem[] {
  return items.filter((item) => item.show !== false);
}
// 页面模式：config.toml 为基础，PAGE_MODE 环境变量可覆盖（便于部署后免改代码切换）
//   PAGE_MODE = "single" | "scroll"
function resolveMode(): string {
  const envMode = import.meta.env.PAGE_MODE;
  if (envMode === "single" || envMode === "scroll") {
    return envMode;
  }
  return config.mode || "single";
}

// B站 UID：config.toml 为基础，BILIBILI_UID 环境变量可覆盖（非法值回退配置文件）
function resolveBilibiliUid(): number | undefined {
  const envUid = import.meta.env.BILIBILI_UID;
  if (envUid !== undefined && envUid.trim() !== "") {
    const n = Number(envUid);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return config.bilibili_uid;
}
// 解析页脚底部信息：内容来自 config.toml，环境变量仅控制开关（便于部署后免改代码）
//   FOOTER_SHOW      = "false" 隐藏整行（默认 true）
//   FOOTER_ICP_SHOW  = "false" 单独隐藏备案号（默认 true，仅当配置了 [footer.icp]）
function resolveFooter(): RawFooter {
  const footer: RawFooter = {
    show: config.footer?.show !== false,
    items: filterVisibleItems(config.footer?.items || []),
    icp: config.footer?.icp ? { ...config.footer.icp } : undefined,
  };

  const envShow = import.meta.env.FOOTER_SHOW;
  if (envShow !== undefined) {
    footer.show = envShow !== "false";
  }

  const envIcpShow = import.meta.env.FOOTER_ICP_SHOW;
  if (envIcpShow !== undefined && footer.icp) {
    footer.icp.show = envIcpShow !== "false";
  }

  return footer;
}

export function getRawProfile() {
  return {
    name: config.name,
    site_title: config.site_title || config.name,
    logo: config.logo || config.name,
    background_text: config.background_text || config.name,
    bilibili_uid: resolveBilibiliUid(),
    avatar: config.avatar || "",
    titles: config.titles || [config.title || config.name],
    typewriter_speed: config.typewriter_speed || 120,
    bio: config.bio,
    mode: resolveMode(),
    content_source: config.content_source || "strapi",
    modules: config.modules || {},
    works: config.works || [],
    stats: config.stats || [],
    show_social_icons: config.show_social_icons !== false,
    footer: resolveFooter(),
    socials: config.socials.map((s) => ({
      name: s.name,
      url: s.url,
      icon: s.icon || iconMap[s.name.toLowerCase()] || s.name.toLowerCase(),
      logo: s.logo || "",
    })),
  };
}

export const profile = getRawProfile();
