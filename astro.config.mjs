// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// 部署目标：通过环境变量选择，构建时无需修改本文件
//   DEPLOY_TARGET=cloudflare → Cloudflare Workers（产物 dist/client + dist/server）
//   DEPLOY_TARGET=netlify    → Netlify Functions（产物 dist/ + .netlify/）
//   DEPLOY_TARGET=edgeone    → EdgeOne Makers（产物 .edgeone/，等官方适配 Astro 7）
//   DEPLOY_TARGET=esa        → 阿里云 ESA 函数和Pages（纯静态构建，动态接口走边缘函数，见 esa.jsonc）
//   其他（默认）              → Node.js Standalone（本地开发 / 自托管）
const deployTarget = process.env.DEPLOY_TARGET || 'node';

// ESA 官方仅支持静态站点生成模式（output: 'static'，无适配器）
const isEsa = deployTarget === 'esa';

// 按部署目标选择适配器。
// 用动态 import：4 个适配器包只在被选中时才加载，否则每次都把它们全部读进来，
// 会明显拖慢 build / dev 的启动（适配器包本身都不小）。
async function resolveAdapter() {
  switch (deployTarget) {
    case 'cloudflare': {
      const { default: cloudflare } = await import('@astrojs/cloudflare');
      return cloudflare();
    }
    case 'netlify': {
      const { default: netlify } = await import('@astrojs/netlify');
      return netlify();
    }
    case 'edgeone': {
      // ⚠️ @edgeone/astro@1.1.5 仅支持 Astro 5/6，尚未适配 Astro 7，
      // 构建会失败，等待官方发布新版本后再启用
      const { default: edgeone } = await import('@edgeone/astro');
      return edgeone({
        includeFiles: ['node_modules/clsx/**'],
      });
    }
    case 'esa':
      // 纯静态构建，无需适配器；构建请走 pnpm build:esa（scripts/esa-build.mjs），
      // 该脚本会临时移出 SSR 端点 src/pages/api/bili-api.ts（静态模式不允许存在）
      return undefined;
    default: {
      const { default: node } = await import('@astrojs/node');
      return node({ mode: 'standalone' });
    }
  }
}

// https://astro.build/config
export default defineConfig({
  // ESA 为纯静态托管，其余目标 SSR
  output: isEsa ? 'static' : 'server',
  // Preact 的 compat 模式：保留 React 写法（hooks / forwardRef / 类型），
  // 运行时由 preact/compat 提供，首屏 JS 相比 react-dom 减少约 165KB
  integrations: [preact({ compat: true })],
  adapter: await resolveAdapter(),
  vite: {
    plugins: [tailwindcss()],
    build: {
      // 关掉 gzip 体积统计：构建时无需再为每个 chunk 算一遍压缩后大小
      reportCompressedSize: false,
    },
    optimizeDeps: {
      // 跳过对 Font Awesome 大图标包的预打包，缩短 dev 启动时间
      exclude: [
        '@fortawesome/free-brands-svg-icons',
        '@fortawesome/free-solid-svg-icons',
      ],
    },
  },
});
