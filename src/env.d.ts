/// <reference types="astro/client" />

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
