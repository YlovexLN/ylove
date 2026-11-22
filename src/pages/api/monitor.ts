import type { APIRoute } from "astro";
import { buildEnv, resolveMonitorConfig, toPublicTargets } from "@/data/monitor";
import { collectMonitorEnv } from "@/lib/monitor-env";
import { probeTargets, tcpSupported } from "@/lib/monitor-probe";
import { getHistory, recordSamples } from "@/lib/monitor-history";
import type { MonitorResponse } from "@/interfaces/monitor";

export const prerender = false;

/** 结果缓存：多个访客轮询时合并成一次真实探测 */
const TTL = 25_000;

let cache: { ts: number; body: string } | null = null;

function json(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      // 历史由服务端共享，这里只需防止高频重复探测
      "Cache-Control": "no-store",
    },
  });
}

/** 缓存响应里只替换 history 字段，保留其余探测结果不变 */
function replaceHistory(body: string, history: ReturnType<typeof getHistory>): string {
  const start = body.indexOf(',"history":');
  if (start === -1) return body;
  // history 是 payload 中最后一个字段，直接截到结尾并重新拼上即可
  return body.slice(0, start) + ',"history":' + JSON.stringify(history) + "}";
}

export const GET: APIRoute = async ({ locals }) => {
  const now = Date.now();
  // 平台运行时环境变量优先，其次构建期内联值
  const env = collectMonitorEnv(locals, buildEnv);
  const config = resolveMonitorConfig(env);

  // 关闭，或平台还没配节点：都返回 enabled 的真实值，
  // 让前端能区分「已关闭」和「尚未配置目标」，不误报成关闭。
  if (!config.enabled || config.targets.length === 0) {
    const payload: MonitorResponse = {
      ts: now,
      enabled: config.enabled,
      title: config.title,
      interval: config.interval,
      tcp: tcpSupported(),
      targets: [],
      results: [],
      ...(config.warning ? { warning: config.warning } : {}),
    };
    return json(JSON.stringify(payload));
  }

  if (cache && now - cache.ts < TTL) {
    // 探测结果可复用，但历史快照按当前时间裁剪，避免时间轴停在缓存时刻
    return json(replaceHistory(cache.body, getHistory()));
  }

  const results = await probeTargets(config.targets, config.timeout);
  // 服务端按整点累计，所有访客共享同一份历史；客户端不再各存一份
  recordSamples(results);
  const payload: MonitorResponse = {
    ts: now,
    history: getHistory(),
    enabled: true,
    title: config.title,
    interval: config.interval,
    tcp: tcpSupported(),
    // 目标清单随结果一起下发：页面完全由接口驱动，构建期不注入任何节点信息
    targets: toPublicTargets(config.targets),
    results,
    ...(config.warning ? { warning: config.warning } : {}),
  };
  const body = JSON.stringify(payload);

  cache = { ts: now, body };
  return json(body);
};
