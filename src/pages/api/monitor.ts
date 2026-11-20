import type { APIRoute } from "astro";
import { buildEnv, resolveMonitorConfig, toPublicTargets } from "@/data/monitor";
import { collectMonitorEnv } from "@/lib/monitor-env";
import { probeTargets, tcpSupported } from "@/lib/monitor-probe";
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
      // 浏览器侧另有 localStorage 记录历史，这里只需防止高频重复探测
      "Cache-Control": "public, max-age=20",
    },
  });
}

export const GET: APIRoute = async ({ locals }) => {
  // 平台运行时环境变量优先，其次构建期内联值
  const env = collectMonitorEnv(locals, buildEnv);
  const config = resolveMonitorConfig(env);

  // 关闭，或平台还没配节点：都返回 enabled 的真实值，
  // 让前端能区分「已关闭」和「尚未配置目标」，不误报成关闭。
  if (!config.enabled || config.targets.length === 0) {
    const payload: MonitorResponse = {
      ts: Date.now(),
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

  if (cache && Date.now() - cache.ts < TTL) return json(cache.body);

  const results = await probeTargets(config.targets, config.timeout);
  const payload: MonitorResponse = {
    ts: Date.now(),
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

  cache = { ts: Date.now(), body };
  return json(body);
};
