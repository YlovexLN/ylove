/// <reference types="astro/client" />

// Astro 语言服务在 .astro 文件里解析 CSS 副作用导入时会漏掉 astro/client 的 *.css 声明，
// 这里显式补充一条 shim，消除“找不到模块或类型声明”的误报（tsc 不会报错）。
declare module "*.css";

// 同理补充 Vite 的 ?raw 资源导入声明（config.toml?raw、work.md?raw 等）
declare module "*?raw" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly STRAPI_URL: string;
  readonly STRAPI_TOKEN?: string;
  /** 页面模式（"single"/"scroll"，覆盖 config.toml） */
  readonly PAGE_MODE?: string;
  /** B站 UID（覆盖 config.toml，用于头像自动获取） */
  readonly BILIBILI_UID?: string;
  /** 页脚底部信息开关（"true"/"false"，覆盖 config.toml） */
  readonly FOOTER_SHOW?: string;
  /** 备案号单独控制开关（"true"/"false"，覆盖 config.toml 的 [footer.icp]） */
  readonly FOOTER_ICP_SHOW?: string;
  /** 赞助入口显示开关（"true"/"false"，覆盖 config.toml 中 /sponsor 链接的 show） */
  readonly SPONSOR_SHOW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
