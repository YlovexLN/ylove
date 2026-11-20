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
 *
 * ESA 控制台的「环境变量」是**构建期**注入的（与 BILIBILI_UID 同理），边缘函数运行时
 * 读不到，所以这里把环境变量与 config.toml 的最终结果烘焙进 monitor-defaults.js。
 * 优先级与站点其它配置一致：环境变量 > config.toml。
 *
 * 生成的数组只保留探测所需字段，且丢弃缺少必填项的条目（与 src/data/monitor.ts 的规则一致）。
 */
async function generateMonitorDefaults() {
  let monitor = {};
  let fileTargets = [];

  try {
    const config = parse(await readFile(configFile, "utf8"));
    monitor = config.monitor || {};
    fileTargets = Array.isArray(monitor.targets) ? monitor.targets : [];
  } catch (error) {
    console.warn(`[esa-build] 读取 config.toml 失败，监控默认值改用环境变量：${error.message}`);
  }

  /** 读构建期环境变量；空串视为未设置 */
  const env = (key) => {
    const value = process.env[key];
    return value === undefined || value === "" ? undefined : value;
  };
  const envNum = (key) => {
    const raw = env(key);
    if (raw === undefined) return undefined;
    const num = Number(raw);
    return Number.isFinite(num) ? num : undefined;
  };

  // 节点：环境变量 MONITOR_TARGETS 优先，其次 config.toml
  let rawTargets = fileTargets;
  let source = `config.toml（${fileTargets.length} 个节点）`;
  const envTargets = env("MONITOR_TARGETS");
  if (envTargets !== undefined) {
    try {
      const parsed = JSON.parse(envTargets);
      if (Array.isArray(parsed)) {
        rawTargets = parsed;
        source = `环境变量 MONITOR_TARGETS（${parsed.length} 个节点）`;
      } else {
        console.warn("[esa-build] MONITOR_TARGETS 必须是 JSON 数组，已改用 config.toml");
      }
    } catch {
      console.warn("[esa-build] MONITOR_TARGETS 不是合法 JSON（检查是否为半角标点），已改用 config.toml");
    }
  }

  const targets = rawTargets
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
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

  const defaults = {
    title: env("MONITOR_TITLE") || monitor.title || "服务可用率",
    interval: envNum("MONITOR_INTERVAL") ?? (Number(monitor.interval) || 60),
    timeout: envNum("MONITOR_TIMEOUT") ?? (Number(monitor.timeout) || 5000),
    showHosts: env("MONITOR_SHOW_HOSTS") !== undefined
      ? env("MONITOR_SHOW_HOSTS") !== "false"
      : monitor.show_hosts === true,
  };

  const content = `// 由 scripts/esa-build.mjs 生成，请勿手改（已在 .gitignore 中忽略）。
//
// ESA 控制台的环境变量是构建期注入的，边缘函数运行时读不到，
// 所以构建时把「环境变量 / config.toml 的最终结果」烘焙进本文件。
// 优先级：构建期环境变量 > config.toml。
export const DEFAULT_TARGETS = ${JSON.stringify(targets, null, 2)};

export const DEFAULT_MONITOR = ${JSON.stringify(defaults, null, 2)};
`;

  await writeFile(defaultsFile, content, "utf8");
  console.log(`[esa-build] 已生成 esa/functions/monitor-defaults.js（来源：${source}）`);
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
