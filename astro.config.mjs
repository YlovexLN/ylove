// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import cloudflare from '@astrojs/cloudflare';
import edgeone from '@edgeone/astro';

// 部署目标：通过环境变量选择，构建时无需修改本文件
//   DEPLOY_TARGET=cloudflare → Cloudflare Workers（产物 dist/_worker.js）
//   DEPLOY_TARGET=edgeone    → EdgeOne Makers（产物 .edgeone/）
//   其他（默认）              → Node.js Standalone（本地开发 / 自托管）
const deployTarget = process.env.DEPLOY_TARGET || 'node';

// 按部署目标选择适配器
function resolveAdapter() {
  switch (deployTarget) {
    case 'cloudflare':
      return cloudflare();
    case 'edgeone':
      return edgeone();
    default:
      return node({ mode: 'standalone' });
  }
}

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [react()],
  adapter: resolveAdapter(),
  vite: {
    plugins: [tailwindcss()],
    // 跳过对 Font Awesome 大图标包的预打包，缩短启动时间
    // 本项目按需导入的图标很少，浏览器实际加载的模块有限，影响可忽略
    optimizeDeps: {
      exclude: [
        '@fortawesome/free-brands-svg-icons',
        '@fortawesome/free-solid-svg-icons',
      ],
    },
  },
});
