// ESA Pages 构建脚本（package.json: pnpm build:esa）
//
// 1) ESA 仅支持静态构建（output: 'static'），而静态模式不允许存在 SSR 端点
//    （src/pages/api/*.ts 都声明了 prerender = false），构建前先将其移出；
//    动态接口由 ESA 边缘函数提供（esa/functions/bili-api.ts，见 esa.jsonc entry）。
// 2) 以 DEPLOY_TARGET=esa 运行 astro build。
// 3) 无论构建成败都恢复路由文件（备份存放于 node_modules/.esa-backup/，不污染 git）。
import { readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 需要在静态构建期间移出的 SSR 端点（每个都由边缘函数提供同名接口）
const apiDir = path.join(root, "src", "pages", "api");
const backupDir = path.join(root, "node_modules", ".esa-backup");
const endpoints = ["bili-api.ts", "monitor.ts"];

// 直接用 node 执行 astro 的 bin，避免依赖 pnpm/npm 在 PATH 中
const astroBin = path.join(root, "node_modules", "astro", "bin", "astro.mjs");

/** 读取端点内容；若上次构建被强杀未恢复，则从备份找回 */
async function readEndpoint(name) {
  const file = path.join(apiDir, name);
  try {
    return { file, content: await readFile(file, "utf8") };
  } catch {
    try {
      const content = await readFile(path.join(backupDir, name), "utf8");
      return { file, content };
    } catch {
      console.error(`[esa-build] 找不到 ${path.relative(root, file)}`);
      process.exit(1);
    }
  }
}

async function main() {
  const endpointsToMove = [];
  await mkdir(backupDir, { recursive: true });

  for (const name of endpoints) {
    const { file, content } = await readEndpoint(name);
    await writeFile(path.join(backupDir, name), content);
    await rm(file, { force: true });
    endpointsToMove.push({ name, file, content });
  }

  let code = 1;
  try {
    const child = spawn(process.execPath, [astroBin, "build"], {
      env: { ...process.env, DEPLOY_TARGET: "esa" },
      stdio: "inherit",
    });
    code = await new Promise((resolve) => child.on("close", resolve));
  } finally {
    for (const { name, file, content } of endpointsToMove) {
      await writeFile(file, content);
      console.log(`[esa-build] 已恢复 src/pages/api/${name}`);
    }
  }
  process.exit(code ?? 1);
}

main();
