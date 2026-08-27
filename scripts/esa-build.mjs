// ESA Pages 构建脚本（package.json: pnpm build:esa）
//
// 1) ESA 仅支持静态构建（output: 'static'），而静态模式不允许存在 SSR 端点
//    （src/pages/api/bili-api.ts 声明了 prerender = false），构建前先将其移出；
//    动态接口由 ESA 边缘函数提供（esa/functions/bili-api.ts，见 esa.jsonc entry）。
// 2) 以 DEPLOY_TARGET=esa 运行 astro build。
// 3) 无论构建成败都恢复路由文件（备份存放于 node_modules/.esa-backup/，不污染 git）。
import { readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiFile = path.join(root, "src", "pages", "api", "bili-api.ts");
const backupFile = path.join(root, "node_modules", ".esa-backup", "bili-api.ts");
// 直接用 node 执行 astro 的 bin，避免依赖 pnpm/npm 在 PATH 中
const astroBin = path.join(root, "node_modules", "astro", "bin", "astro.mjs");

async function main() {
  // 读取路由文件；若上次构建被强杀未恢复，则从备份找回
  let content = "";
  try {
    content = await readFile(apiFile, "utf8");
  } catch {
    try {
      content = await readFile(backupFile, "utf8");
    } catch {
      console.error("[esa-build] 找不到 src/pages/api/bili-api.ts");
      process.exit(1);
    }
  }

  await mkdir(path.dirname(backupFile), { recursive: true });
  await writeFile(backupFile, content);
  await rm(apiFile, { force: true });

  let code = 1;
  try {
    const child = spawn(
      process.execPath,
      [astroBin, "build"],
      { env: { ...process.env, DEPLOY_TARGET: "esa" }, stdio: "inherit" }
    );
    code = await new Promise((resolve) => child.on("close", resolve));
  } finally {
    await writeFile(apiFile, content);
    console.log("[esa-build] 已恢复 src/pages/api/bili-api.ts");
  }
  process.exit(code ?? 1);
}

main();
