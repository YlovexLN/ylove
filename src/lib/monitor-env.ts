/**
 * 运行时环境变量收集
 *
 * 监控配置优先读「平台运行时环境变量」，其次才是构建期内联的 import.meta.env：
 *   · Node / Netlify：process.env
 *   · Cloudflare Workers：locals.runtime.env（nodejs_compat 下 process.env 也会带上）
 * 只收集 MONITOR_ 前缀的键，避免把整个环境搬进内存。
 */

/** 需要在运行时收集的环境变量前缀 */
const PREFIX = "MONITOR_";

type EnvRecord = Record<string, string | undefined>;

function collectProcessEnv(): EnvRecord {
  const out: EnvRecord = {};
  try {
    if (typeof process === "undefined" || !process.env) return out;
    for (const key of Object.keys(process.env)) {
      if (key.startsWith(PREFIX)) {
        const value = process.env[key];
        if (typeof value === "string") out[key] = value;
      }
    }
  } catch {
    /* 部分边缘运行时没有 process，忽略 */
  }
  return out;
}

function collectRuntimeEnv(locals?: App.Locals): EnvRecord {
  const out: EnvRecord = {};
  try {
    // Cloudflare 适配器：locals.runtime.env
    const runtime = (locals as any)?.runtime?.env;
    if (runtime && typeof runtime === "object") {
      for (const key of Object.keys(runtime)) {
        if (key.startsWith(PREFIX)) {
          const value = runtime[key];
          if (typeof value === "string") out[key] = value;
        }
      }
    }
  } catch {
    /* 适配器未提供 runtime.env，忽略 */
  }
  return out;
}

/**
 * 合并出最终的环境变量表：运行时平台变量优先于构建期内联值。
 */
export function collectMonitorEnv(locals?: App.Locals, buildEnv?: EnvRecord): EnvRecord {
  return { ...(buildEnv || {}), ...collectRuntimeEnv(locals), ...collectProcessEnv() };
}
