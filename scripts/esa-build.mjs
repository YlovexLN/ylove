// ESA Pages 构建脚本（package.json: pnpm build:esa）
//
// 1) ESA 仅支持静态构建（output: 'static'），而静态模式不允许存在 SSR 端点
//    （src/pages/api/*.ts 都声明了 prerender = false），构建前先将其移出；
//    动态接口由 ESA 边缘函数提供（esa/functions/bili-api.ts，见 esa.jsonc entry）。
// 2) 边缘函数独立打包、读不到 config.toml，故把 [monitor] 的默认值生成到
//    esa/functions/monitor-defaults.js，作为平台环境变量缺失时的兜底。
// 3) 以 DEPLOY_TARGET=esa 运行 astro build。
// 4) 无论构建成败都恢复路由文件（备份存放于 node_modules/.esa-backup/，不污染 git）。
import { readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 需要在静态构建期间移出的 SSR 端点（每个都由边缘函数提供同名接口）
const apiDir = path.join(root, "src", "pages", "api");
const backupDir = path.join(root, "node_modules", ".esa-backup");
const endpoints = ["bili-api.ts", "monitor.ts"];

// 边缘函数的默认配置生成目标
const configFile = path.join(root, "config.toml");
const defaultsFile = path.join(root, "esa", "functions", "monitor-defaults.js");

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

/**
 * 依据 config.toml 的 [monitor] / [[monitor.targets]] 生成边缘函数的默认配置。
 * 生成的数组只保留探测所需字段，且丢弃缺少必填项的条目（与 src/data/monitor.ts 的规则一致）。
 */
async function generateMonitorDefaults() {
  let monitor = {};
  let rawTargets = [];

  try {
    const config = parse(await readFile(configFile, "utf8"));
    monitor = config.monitor || {};
    rawTargets = Array.isArray(monitor.targets) ? monitor.targets : [];
  } catch (error) {
    console.warn(`[esa-build] 读取 config.toml 失败，监控默认值留空：${error.message}`);
  }

  const targets = rawTargets
    .map((item, index) => {
      const id = item.id || `target-${index + 1}`;
      const name = item.name || `目标 ${index + 1}`;

      if (item.type === "tcp") {
        // host 留空时由边缘函数在运行时读 MONITOR_HOST_<ID>，这里照抄（可能为空）
        const port = Number(item.port);
        if (!Number.isFinite(port)) return null;
        return { id, name, type: "tcp", host: item.host || "", port };
      }

      if (!item.url) return null;
      return {
        id,
        name,
        type: "http",
        url: item.url,
        ...(item.secure === true ? { secure: true } : {}),
      };
    })
    .filter(Boolean);

  const content = `// 由 scripts/esa-build.mjs 依据 config.toml 的 [monitor] / [[monitor.targets]] 生成，请勿手改。
//
// 边缘函数是独立打包的，读不到 config.toml（那份文件由 Vite 在构建期内联），
// 所以构建时把「配置文件里的默认值」写进这个文件，作为平台环境变量缺失时的兜底。
// 优先级：平台环境变量 > 本文件（来自 config.toml）。
export const DEFAULT_TARGETS = ${JSON.stringify(targets, null, 2)};

export const DEFAULT_MONITOR = ${JSON.stringify(
    {
      title: monitor.title || "服务可用率",
      interval: Number(monitor.interval) || 60,
      timeout: Number(monitor.timeout) || 5000,
      showHosts: monitor.show_hosts === true,
    },
    null,
    2
  )};
`;

  await writeFile(defaultsFile, content, "utf8");
  console.log(`[esa-build] 已生成 esa/functions/monitor-defaults.js（${targets.length} 个节点）`);
}

async function main() {
  await generateMonitorDefaults();

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
