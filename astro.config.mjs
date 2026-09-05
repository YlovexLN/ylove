// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import cloudflare from '@astrojs/cloudflare';
import netlify from '@astrojs/netlify';
import vercel from '@astrojs/vercel';
import edgeone from '@edgeone/astro';

// 部署目标：通过环境变量选择，构建时无需修改本文件
//   DEPLOY_TARGET=cloudflare → Cloudflare Workers（产物 dist/client + dist/server）
//   DEPLOY_TARGET=netlify    → Netlify Functions（产物 dist/ + .netlify/）
//   DEPLOY_TARGET=vercel     → Vercel Serverless（产物 .vercel/output/）
//   DEPLOY_TARGET=edgeone    → EdgeOne Makers（产物 .edgeone/，等官方适配 Astro 7）
//   DEPLOY_TARGET=esa        → 阿里云 ESA 函数和Pages（纯静态构建，动态接口走边缘函数，见 esa.jsonc）
//   其他（默认）              → Node.js Standalone（本地开发 / 自托管）
const deployTarget = process.env.DEPLOY_TARGET || 'node';

// ESA 官方仅支持静态站点生成模式（output: 'static'，无适配器）
const isEsa = deployTarget === 'esa';

// 按部署目标选择适配器
function resolveAdapter() {
  switch (deployTarget) {
    case 'cloudflare':
      return cloudflare();
    case 'netlify':
      return netlify();
    case 'vercel':
      // @astrojs/vercel 输出到 .vercel/output（Vercel Build Output API），Git 导入自动部署
      return vercel();
    case 'edgeone':
      // ⚠️ @edgeone/astro@1.1.5 仅支持 Astro 5/6，尚未适配 Astro 7，
      // 构建会失败，等待官方发布新版本后再启用
      return edgeone({
        includeFiles: ['node_modules/clsx/**'],
      });
    case 'esa':
      // 纯静态构建，无需适配器；构建请走 pnpm build:esa（scripts/esa-build.mjs），
      // 该脚本会临时移出 SSR 端点 src/pages/api/bili-api.ts（静态模式不允许存在）
      return undefined;
    default:
      return node({ mode: 'standalone' });
  }
}

// https://astro.build/config
export default defineConfig({
  // ESA 为纯静态托管，其余目标 SSR
  output: isEsa ? 'static' : 'server',
  integrations: [react()],
  adapter: resolveAdapter(),
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // 跳过对 Font Awesome 大图标包的预打包，缩短 dev 启动时间
      exclude: [
        '@fortawesome/free-brands-svg-icons',
        '@fortawesome/free-solid-svg-icons',
      ],
    },
  },
});
