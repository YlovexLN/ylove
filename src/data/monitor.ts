import { parse } from "smol-toml";
import raw from "../../config.toml?raw";
import type { MonitorTarget, PublicMonitorTarget } from "@/interfaces/monitor";

interface RawTarget {
  /** 唯一标识，前端用它关联历史；不填则按序号生成 */
  id?: string;
  name: string;
  /** http（默认）或 tcp */
  type?: string;
  url?: string;
  host?: string;
  port?: number;
  /** HTTP 期望状态码 */
  expect_status?: number;
  /** 只认 https */
  secure?: boolean;
  /** 检查证书剩余天数 */
  check_cert?: boolean;
  /** 单独允许展示该目标的地址（覆盖全局 show_hosts） */
  show_host?: boolean;
}

interface RawMonitor {
  enabled?: boolean;
  title?: string;
  interval?: number;
  timeout?: number;
  /** 是否在页面展示目标地址（默认 false，防止主机名 / 游戏服 IP 泄漏） */
  show_hosts?: boolean;
  targets?: RawTarget[];
}

interface RawConfig {
  monitor?: RawMonitor;
}

const config = parse(raw) as unknown as RawConfig;

/** 解析后的监控配置 */
export interface MonitorConfig {
  enabled: boolean;
  title: string;
  /** 前端轮询间隔（秒） */
  interval: number;
  /** 单次探测超时（毫秒） */
  timeout: number;
  /** 探测目标（含 host / url，服务端专用，不直接下发前端） */
  targets: MonitorTarget[];
}

type EnvRecord = Record<string, string | undefined>;

/** 读取字符串环境变量；空字符串视为未设置 */
function envStr(env: EnvRecord, key: string): string | undefined {
  const value = env[key];
  return value === undefined || value === "" ? undefined : value;
}

function envNum(env: EnvRecord, key: string): number | undefined {
  const value = envStr(env, key);
  if (value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function envBool(env: EnvRecord, key: string): boolean | undefined {
  const value = envStr(env, key);
  if (value === undefined) return undefined;
  return value !== "false" && value !== "0";
}

/**
 * TCP 目标的主机名可从环境变量读取，避免写进 config.toml（该文件随仓库公开）。
 * 变量名规则：MONITOR_HOST_<ID 大写，非字母数字转下划线>，例如 id="mc" → MONITOR_HOST_MC
 */
function hostFromEnv(env: EnvRecord, id: string): string {
  const key = `MONITOR_HOST_${id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  return envStr(env, key) || "";
}

/** MONITOR_TARGETS：JSON 数组，整体覆盖 config.toml 的 [[monitor.targets]] */
function targetsFromEnv(env: EnvRecord): RawTarget[] | null {
  const value = envStr(env, "MONITOR_TARGETS");
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item) => item && typeof item === "object") as RawTarget[];
  } catch {
    console.warn("[monitor] MONITOR_TARGETS 不是合法 JSON，已回落 config.toml");
    return null;
  }
}

/** 把配置项规整为探测目标；缺少必填字段（url / host+port）的项直接跳过 */
function toTarget(item: RawTarget, index: number, showHosts: boolean, env: EnvRecord): MonitorTarget | null {
  const name = item.name || `目标 ${index + 1}`;
  const id = item.id || `target-${index + 1}`;
  // 单目标可覆盖全局开关；默认隐藏地址，避免主机名 / IP 进入页面 HTML
  const showHost = item.show_host ?? showHosts;

  if (item.type === "tcp") {
    // host 留空时回落环境变量，配置里就不必出现真实主机名 / IP
    const host = item.host || hostFromEnv(env, id);
    const port = Number(item.port);
    if (!host || !Number.isFinite(port)) return null;
    return {
      id,
      name,
      type: "tcp",
      host,
      port,
      label: `${host}:${port}`,
      showHost,
    };
  }

  if (!item.url) return null;
  let label = item.url;
  try {
    label = new URL(item.url).host;
  } catch {
    /* 非法地址保留原文，探测阶段会失败并显示原因 */
  }
  return {
    id,
    name,
    type: "http",
    url: item.url,
    expectStatus: item.expect_status === undefined ? undefined : Number(item.expect_status),
    secure: item.secure === true,
    checkCert: item.check_cert === true,
    label,
    showHost,
  };
}

/**
 * 解析监控配置。env 为环境变量集合：
 * 运行时传入「平台运行时环境变量 + 构建期内联变量」的合并结果，平台侧优先。
 */
export function resolveMonitorConfig(env: EnvRecord = {}): MonitorConfig {
  const enabled = envBool(env, "MONITOR_SHOW") ?? (config.monitor?.enabled !== false);
  const title = envStr(env, "MONITOR_TITLE") || config.monitor?.title || "服务可用率";
  const interval = Math.max(
    30,
    envNum(env, "MONITOR_INTERVAL") ?? (Number(config.monitor?.interval) || 60)
  );
  const timeout = Math.min(
    10_000,
    Math.max(1_000, envNum(env, "MONITOR_TIMEOUT") ?? (Number(config.monitor?.timeout) || 5_000))
  );
  const showHosts = envBool(env, "MONITOR_SHOW_HOSTS") ?? (config.monitor?.show_hosts === true);

  const rawTargets = targetsFromEnv(env) ?? config.monitor?.targets ?? [];
  const targets = rawTargets
    .map((item, index) => toTarget(item, index, showHosts, env))
    .filter((t): t is MonitorTarget => t !== null);

  return { enabled, title, interval, timeout, targets };
}

/** 构建期内联的环境变量（Vite 会在构建时把 import.meta.env 静态替换） */
export const buildEnv = import.meta.env as unknown as EnvRecord;

/** 构建期配置（页面标题、是否存在监控等静态用途） */
export const monitor = resolveMonitorConfig(buildEnv);

/** 构建期可见的目标清单（仅用于静态场景；页面渲染以接口返回为准） */
export const monitorTargets = monitor.targets;

/** 服务状态总开关：MONITOR_SHOW 环境变量 > config.toml 的 enabled */
export function isMonitorEnabled(): boolean {
  return monitor.enabled;
}

/** 目标转公开形态：未授权展示地址时 label 一律为空 */
export function toPublicTargets(targets: MonitorTarget[]): PublicMonitorTarget[] {
  return targets.map(({ id, name, type, label, showHost }) => ({
    id,
    name,
    type,
    label: showHost ? label : "",
  }));
}
