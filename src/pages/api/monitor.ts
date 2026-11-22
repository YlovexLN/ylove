import type { APIRoute } from "astro";
import { buildEnv, resolveMonitorConfig, toPublicTargets } from "@/data/monitor";
import { collectMonitorEnv } from "@/lib/monitor-env";
import { probeTargets, tcpSupported } from "@/lib/monitor-probe";
import { getHistory, recordSamples } from "@/lib/monitor-history";
import type { MonitorResponse, ProbeResult } from "@/interfaces/monitor";

export const prerender = false;

/** 探测结果缓存：多个访客轮询时合并成一次真实探测 */
const TTL = 25_000;

let cache: { ts: number; results: ProbeResult[] } | null = null;

function json(payload: MonitorResponse): Response {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      // 历史由服务端共享，这里只防止高频重复探测
      "Cache-Control": "no-store",
    },
  });
}

export const GET: APIRoute = async ({ locals, url }) => {
  const now = Date.now();
  // 平台运行时环境变量优先，其次构建期内联值
  const env = collectMonitorEnv(locals, buildEnv);
  const config = resolveMonitorConfig(env);

  // 探测定时器到期后由页面发起：探测可能耗时数秒（TCP 超时更高），
  // 与首屏快照分开，页面进入后先渲染节点和心跳历史。
  const wantProbe = url.searchParams.get("probe") === "1";

  // 关闭，或平台还没配节点：返回 enabled 的真实值，
  // 让前端区分「已关闭」和「尚未配置目标」，不误报成关闭。
  if (!config.enabled || config.targets.length === 0) {
    return json({
      ts: now,
      enabled: config.enabled,
      title: config.title,
      interval: config.interval,
      tcp: tcpSupported(),
      targets: [],
      results: [],
      probed: false,
      history: getHistory(),
      ...(config.warning ? { warning: config.warning } : {}),
    });
  }

  // 探测结果过期时，按需发起一次真实探测：
  // 手动刷新、首次进入页面都会走这里；定时轮询复用缓存。
  if (wantProbe && (!cache || now - cache.ts >= TTL)) {
    const results = await probeTargets(config.targets, config.timeout);
    recordSamples(results);
    cache = { ts: now, results };
  }

  return json({
    ts: now,
    enabled: true,
    title: config.title,
    interval: config.interval,
    tcp: tcpSupported(),
    // 节点清单随响应下发：页面完全由接口驱动，构建期不注入任何地址
    targets: toPublicTargets(config.targets),
    // 快速快照不带探测结果；页面显示「检测中」，随后用 ?probe=1 补齐
    results: cache?.results ?? [],
    probed: Boolean(cache),
    history: getHistory(),
    ...(config.warning ? { warning: config.warning } : {}),
  });
};
