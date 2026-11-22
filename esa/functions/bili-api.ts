// @ts-check
/**
 * ESA 边缘函数 — 替代 SSR 版 /api/bili-api（头像代理 + 直播间状态检测）
 *
 * ER 运行时为 Web Worker 风格（fetch/Request/Response），无 Node Buffer/process，
 * 头像响应用 Response 直接接收 body 流。与 src/pages/api/bili-api.ts 逻辑保持一致。
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

let buvidCookie = "";
let cachedFace = "";
let cachedUid = "";

async function getBuvidCookie(): Promise<string> {
  if (buvidCookie) return buvidCookie;
  try {
    const home = await fetch("https://www.bilibili.com/", {
      headers: { "User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9" },
    });
    const gsc = (home.headers as any).getSetCookie;
    const jar: string[] =
      typeof gsc === "function"
        ? gsc.call(home.headers)
        : home.headers.get("set-cookie")
          ? [home.headers.get("set-cookie")!]
          : [];
    const buvid = jar.find((c) => c.startsWith("buvid3"))?.split(";")[0];
    if (buvid) buvidCookie = buvid;
  } catch {
    /* ignore */
  }
  return buvidCookie;
}

async function buildHeaders(referer: string): Promise<Record<string, string>> {
  const cookie = await getBuvidCookie();
  return {
    "User-Agent": UA,
    Referer: referer,
    "Accept-Language": "zh-CN,zh;q=0.9",
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

async function parseBiliJson(res: Response): Promise<any | null> {
  try {
    return JSON.parse(await res.text());
  } catch {
    return null;
  }
}

// 头像：仅走 x/web-interface/card 取 data.card.face
async function getFaceUrl(uid: string): Promise<string> {
  if (cachedUid === uid && cachedFace) return cachedFace;
  for (let i = 0; i < 2; i++) {
    const headers = await buildHeaders("https://space.bilibili.com/");
    const json = await parseBiliJson(
      await fetch(`https://api.bilibili.com/x/web-interface/card?mid=${uid}`, { headers })
    );
    const face = json?.code === 0 ? json.data?.card?.face || "" : "";
    if (face) {
      cachedFace = face;
      cachedUid = uid;
      return face;
    }
  }
  return "";
}

// ── 服务状态监控（/api/monitor）─────────────────────────────
// ESA 边缘运行时没有 raw socket，只能做 HTTP 探测；
// TCP 目标一律返回 unsupported（前端显示「不支持」，不会误报故障）。
//
// 配置来源（优先级从高到低）：
//   1. 平台环境变量（ESA Runtime API 提供 process.env 子接口）：
//      MONITOR_SHOW / MONITOR_TITLE / MONITOR_INTERVAL / MONITOR_TIMEOUT /
//      MONITOR_SHOW_HOSTS / MONITOR_TARGETS(JSON 数组)
//   2. config.toml 的 [monitor] —— 构建期由 scripts/esa-build.mjs 写进 monitor-defaults.js
//
// 节点清单随接口响应一起下发，页面按接口返回渲染，构建期不注入任何节点信息。
import { DEFAULT_MONITOR, DEFAULT_TARGETS } from "./monitor-defaults.js";
import { getHistory, recordSamples } from "../../src/lib/monitor-history";

interface ProbeResult {
  id: string;
  ok: boolean;
  ms: number;
  status?: number;
  error?: string;
  unsupported?: boolean;
  self?: boolean;
}

interface MonitorTarget {
  id: string;
  name: string;
  type: string;
  url?: string;
  host?: string;
  port?: number;
  secure?: boolean;
}

/** 读取运行时环境变量；边缘运行时没有 process 时返回 undefined */
function readEnv(key: string): string | undefined {
  try {
    const proc = (globalThis as any).process;
    const value = proc?.env?.[key];
    return typeof value === "string" && value !== "" ? value : undefined;
  } catch {
    return undefined;
  }
}

function envBool(key: string): boolean | undefined {
  const value = readEnv(key);
  if (value === undefined) return undefined;
  return value !== "false" && value !== "0";
}

function envNum(key: string): number | undefined {
  const value = readEnv(key);
  if (value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

const DEFAULT_TIMEOUT = DEFAULT_MONITOR.timeout;
const DEFAULT_TITLE = DEFAULT_MONITOR.title;
const DEFAULT_INTERVAL = DEFAULT_MONITOR.interval;

/**
 * 解析节点清单。优先级：平台环境变量 MONITOR_TARGETS > config.toml（构建期写入 monitor-defaults.js）。
 * 环境变量存在但解析失败时，回落到 config.toml 的节点并附 warning。
 * 注意 JSON 必须是半角标点（中文输入法的「，」「：」会让解析失败）。
 */
function resolveTargets(): { targets: MonitorTarget[]; warning?: string } {
  const fromConfig = DEFAULT_TARGETS as MonitorTarget[];
  const raw = readEnv("MONITOR_TARGETS");

  // 平台没配 → 用配置文件里的默认节点
  if (!raw) return { targets: fromConfig };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // ESA 边缘运行时只支持 console.log / console.alert
    console.log("[monitor] MONITOR_TARGETS 不是合法 JSON（检查是否为半角标点），已回落 config.toml");
    return { targets: fromConfig, warning: "MONITOR_TARGETS 不是合法 JSON" };
  }

  if (!Array.isArray(parsed)) {
    return { targets: fromConfig, warning: "MONITOR_TARGETS 必须是 JSON 数组" };
  }

  const list = parsed.filter((item) => item && typeof item === "object") as MonitorTarget[];
  return { targets: list };
}

/** 展示用地址：show_hosts 关闭时返回空串，避免主机名 / IP 外泄 */
function targetLabel(target: MonitorTarget, showHosts: boolean): string {
  if (!showHosts) return "";
  if (target.type === "tcp") return target.host ? `${target.host}:${target.port ?? ""}` : "";
  if (!target.url) return "";
  try {
    return new URL(target.url).host;
  } catch {
    return "";
  }
}

/**
 * 目标是否指向当前站点自身。
 * 比较时忽略 www. 前缀（www.example.com 与 example.com 视为同一站点）。
 */
function isSelfTarget(url: string | undefined, selfHost: string): boolean {
  if (!url) return false;
  const strip = (host: string) => host.toLowerCase().replace(/^www\./, "");
  try {
    return strip(new URL(url).host) === strip(selfHost);
  } catch {
    return false;
  }
}

let monitorCache: { ts: number; results: ProbeResult[] } | null = null;

async function probeHttpTarget(
  target: { id: string; url?: string; secure?: boolean },
  timeout: number
) {
  if (!target.url) {
    return { id: target.id, ok: false, ms: 0, error: "未配置地址" };
  }
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(target.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "*/*", "Cache-Control": "no-cache" },
    });
    const ms = Date.now() - started;
    try {
      await res.body?.cancel();
    } catch {
      /* body 可能不可取消，忽略 */
    }
    const ok = res.status >= 200 && res.status < 400;
    // secure：跟随跳转后仍必须是 https
    if (ok && target.secure && !(res.url || target.url).startsWith("https:")) {
      return { id: target.id, ok: false, ms, status: res.status, error: "未使用 HTTPS" };
    }
    return { id: target.id, ok, ms, status: res.status };
  } catch {
    return { id: target.id, ok: false, ms: Date.now() - started, error: "请求超时或无法连接" };
  } finally {
    clearTimeout(timer);
  }
}

async function handleMonitor(request: Request, selfHost: string, now: number): Promise<Response> {
  // 配置在请求时解析：平台环境变量改了重新部署即生效，无需改代码
  const enabled = envBool("MONITOR_SHOW") ?? true;
  const title = readEnv("MONITOR_TITLE") || DEFAULT_TITLE;
  const interval = Math.max(30, envNum("MONITOR_INTERVAL") ?? DEFAULT_INTERVAL);
  const timeout = Math.min(10_000, Math.max(1_000, envNum("MONITOR_TIMEOUT") ?? DEFAULT_TIMEOUT));
  const showHosts = envBool("MONITOR_SHOW_HOSTS") ?? DEFAULT_MONITOR.showHosts;
  const { targets, warning } = resolveTargets();

  const wantProbe = new URL(request.url).searchParams.get("probe") === "1";

  if (!enabled || targets.length === 0) {
    const empty = JSON.stringify({
      ts: now,
      enabled,
      title,
      interval,
      tcp: false,
      targets: [],
      results: [],
      probed: false,
      history: getHistory(),
      ...(warning ? { warning } : {}),
    });
    return new Response(empty, {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  // 探测结果过期时按需发起，和首屏快照分开；探测可能耗时数秒。
  if (wantProbe && (!monitorCache || now - monitorCache.ts >= 25_000)) {
    const results = await Promise.all(
      targets.map((target) => {
        if (target.type === "tcp") {
          return Promise.resolve({ id: target.id, ok: false, ms: 0, unsupported: true });
        }
        // 自身目标：边缘函数请求自己的域名会被拦成 502，能返回响应即说明在线
        if (isSelfTarget(target.url, selfHost)) {
          return Promise.resolve({ id: target.id, ok: true, ms: 0, self: true });
        }
        return probeHttpTarget(target, timeout);
      })
    );
    recordSamples(results);
    monitorCache = { ts: now, results };
  }

  // 节点清单随响应下发：页面完全由接口驱动，静态 HTML 不含任何节点信息
  const body = JSON.stringify({
    ts: now,
    enabled: true,
    title,
    interval,
    tcp: false,
    targets: targets.map((target) => ({
      id: target.id,
      name: target.name || target.id,
      type: target.type,
      // 不下发地址，避免主机名 / IP 外泄（show_hosts 开启时才带）
      label: targetLabel(target, showHosts),
    })),
    results: monitorCache?.results ?? [],
    probed: Boolean(monitorCache),
    history: getHistory(),
  });
  return new Response(body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/monitor")) {
      return handleMonitor(request, url.host, Date.now());
    }
    if (!url.pathname.startsWith("/api/bili-api")) {
      return new Response("Not Found", { status: 404 });
    }
    const uid = url.searchParams.get("uid");
    if (!uid) {
      return new Response(JSON.stringify({ live: false }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 头像代理：成功返回图片字节，失败 404 交由前端回退 config.toml avatar 兜底
    if (url.searchParams.get("action") === "avatar") {
      const faceUrl = await getFaceUrl(uid);
      if (faceUrl) {
        const headers = await buildHeaders("https://space.bilibili.com/");
        const imgRes = await fetch(faceUrl, { headers });
        if (imgRes.ok) {
          return new Response(imgRes.body, {
            status: 200,
            headers: {
              "Content-Type": imgRes.headers.get("content-type") || "image/jpeg",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }
      return new Response("avatar unavailable", {
        status: 404,
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      });
    }

    // 直播状态：card 不含 live 信息，需单独查直播接口
    try {
      const headers = await buildHeaders("https://live.bilibili.com/");
      const json = await parseBiliJson(
        await fetch(
          `https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=${uid}`,
          { headers }
        )
      );
      const data = json?.code === 0 ? json.data : null;
      return new Response(
        JSON.stringify({ live: data?.liveStatus === 1, roomId: String(data?.roomid || "") }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch {
      return new Response(JSON.stringify({ live: false, roomId: "" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
