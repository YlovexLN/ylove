import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { faArrowRotateRight } from "@fortawesome/free-solid-svg-icons/faArrowRotateRight";
import { faHeartPulse } from "@fortawesome/free-solid-svg-icons/faHeartPulse";
import type { MonitorResponse, ProbeResult, PublicMonitorTarget } from "@/interfaces/monitor";
import {
  MONITOR_BUCKETS,
  type MonitorBucket,
  type MonitorStore,
} from "@/lib/monitor-history";

const HOUR = 3_600_000;

/** 每个格子的配色：全绿=正常，偏黄=有零星失败，红=失败过半，灰=无数据 */
function bucketTone(bucket?: MonitorBucket): string {
  if (!bucket || bucket.total === 0) return "bg-white/12";
  const ratio = bucket.ok / bucket.total;
  if (ratio === 1) return "bg-gold";
  if (ratio >= 0.9) return "bg-amber-400";
  return "bg-red-400";
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function StatusPage() {
  const [title, setTitle] = useState("");
  const [interval, setIntervalValue] = useState(60);
  const [targets, setTargets] = useState<PublicMonitorTarget[]>([]);
  const [results, setResults] = useState<Record<string, ProbeResult>>({});
  const [store, setStore] = useState<MonitorStore>({});
  const [updatedAt, setUpdatedAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  // 是否已收到接口响应（区分「加载中」与「当前环境没配置这个节点」）
  const [loaded, setLoaded] = useState(false);
  // 是否至少拿到过一次探测结果（快照可能还没探测）
  const [probed, setProbed] = useState(false);
  // 运行时开关：平台侧关掉监控时页面只提示，不显示任何节点
  const [enabled, setEnabled] = useState(true);
  // 配置有误时的提示（如 MONITOR_TARGETS 不是合法 JSON）
  const [warning, setWarning] = useState("");

  /** 取快照：只读缓存与历史，不跑探测，首屏立即出图 */
  const refresh = useCallback(async (probe = false) => {
    if (probe) setBusy(true);
    try {
      const res = await fetch(probe ? "/api/monitor?probe=1" : "/api/monitor", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as MonitorResponse;

      setTitle(data.title);
      setIntervalValue(data.interval);
      setEnabled(data.enabled !== false);
      setWarning(data.warning || "");
      setTargets(data.targets || []);
      setResults(Object.fromEntries(data.results.map((r) => [r.id, r])));
      setProbed(data.probed);
      setUpdatedAt(data.ts);
      setOffline(false);
      setLoaded(true);

      // 历史由服务端按整点聚合后下发，所有设备看到同一份
      if (data.history) setStore(data.history);
    } catch {
      setOffline(true);
      setLoaded(true);
    } finally {
      if (probe) setBusy(false);
    }
  }, []);

  // 首屏先拿快照渲染节点与心跳图，探测另起一个请求；探测慢也不会白屏
  useEffect(() => {
    refresh().then(() => refresh(true));
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => refresh(true), interval * 1000);
    return () => clearInterval(timer);
  }, [refresh, interval]);

  // 用服务端采样时间定位格子，避免客户端时钟不准导致历史落在错误的格子里
  const hours = useMemo(() => {
    if (!updatedAt) return [];
    const end = Math.floor(updatedAt / HOUR) * HOUR;
    return Array.from({ length: MONITOR_BUCKETS }, (_, i) => end - (MONITOR_BUCKETS - 1 - i) * HOUR);
  }, [updatedAt]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-display font-bold md:text-4xl">
            <Icon icon={faHeartPulse} className="h-6 w-6 text-gold" />
            {title || "服务可用率"}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {offline
              ? "检测服务暂不可用，稍后自动重试"
              : updatedAt
                ? `${probed ? `最近更新 ${formatTime(updatedAt)}` : "正在检测…"} · 每 ${interval} 秒自动检测`
                : "正在检测…"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refresh(true)} disabled={busy}>
          <Icon icon={faArrowRotateRight} className={busy ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
          <span className="ml-1.5">刷新</span>
        </Button>
      </header>

      {loaded && !enabled ? (
        <p className="rounded-xl border border-border-default bg-bg-card p-6 text-sm text-text-muted">
          服务状态监控当前已关闭。
        </p>
      ) : loaded && targets.length === 0 ? (
        <p className="rounded-xl border border-border-default bg-bg-card p-6 text-sm text-text-muted">
          {warning ? `监控配置有误：${warning}（请检查环境变量 MONITOR_TARGETS 的 JSON 格式）` : "尚未配置监控目标。"}
        </p>
      ) : (
        <div className="grid gap-4">
          {targets.map((target) => (
            <TargetCard
              key={target.id}
              target={target}
              result={results[target.id]}
              loaded={loaded}
              probed={probed}
              buckets={hours.map((h) => store[target.id]?.[h])}
              hours={hours}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  target: PublicMonitorTarget;
  result?: ProbeResult;
  /** 是否已收到过接口响应 */
  loaded: boolean;
  /** 是否已经完成过至少一次真实探测 */
  probed: boolean;
  buckets: (MonitorBucket | undefined)[];
  hours: number[];
}

function TargetCard({ target, result, loaded, probed, buckets, hours }: CardProps) {
  // 快照阶段不算「未配置」，要等探测请求回来才能下这个结论
  const missing = loaded && probed && !result;
  const sampled = buckets.filter((b): b is MonitorBucket => Boolean(b?.total));
  const total = sampled.reduce((sum, b) => sum + b.total, 0);
  const okCount = sampled.reduce((sum, b) => sum + b.ok, 0);
  const uptime = total > 0 ? (okCount / total) * 100 : null;

  const dot = result
    ? result.unsupported
      ? "bg-white/20"
      : result.ok
        ? "bg-gold"
        : "bg-red-400"
    : "bg-white/20";

  return (
    <section className="rounded-2xl border border-border-default bg-bg-card/60 p-5 transition-colors duration-200 hover:border-border-hover">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          <span className="truncate text-sm font-bold">{target.name}</span>
          <span className="shrink-0 rounded border border-border-default px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-muted">
            {target.type}
          </span>
          {result && !result.unsupported && !result.self && (
            <span className="shrink-0 text-xs tabular-nums text-text-muted">
              {result.ok ? `${result.ms} ms` : result.error || "不可用"}
            </span>
          )}
          {result?.self && (
            <span
              className="shrink-0 text-xs text-text-muted"
              title="目标就是当前站点自身，边缘函数无法探测自己的域名，故按「正在服务请求」判定在线"
            >
              自身
            </span>
          )}
          {missing && (
            <span className="shrink-0 text-xs text-amber-400">当前环境未配置该节点</span>
          )}
          {result?.certDays !== undefined && (
            <span
              className={`shrink-0 text-xs tabular-nums ${
                result.certDays < 15 ? "text-amber-400" : "text-text-muted"
              }`}
              title="TLS 证书剩余有效天数"
            >
              证书 {result.certDays} 天
            </span>
          )}
        </div>
        <span className="shrink-0 text-sm tabular-nums text-text-secondary">
          {result?.unsupported ? "不支持" : uptime === null ? "--" : `${uptime.toFixed(2)}%`}
        </span>
      </div>

      <div className="mt-4 flex h-12 items-stretch gap-[3px]">
        {(buckets.length ? buckets : Array.from({ length: MONITOR_BUCKETS }, () => undefined)).map(
          (bucket, i) => (
            <div
              key={i}
              className={`min-w-0 flex-1 rounded-full ${bucketTone(bucket)} ${!probed && !bucket ? "animate-pulse" : ""}`}
              title={
                bucket && bucket.total
                  ? `${formatTime(hours[i])} · 可用 ${((bucket.ok / bucket.total) * 100).toFixed(2)}%（${bucket.ok}/${bucket.total}）`
                  : "暂无数据"
              }
            />
          )
        )}
      </div>

      <p className="mt-3 text-xs text-text-muted">
        {result?.unsupported
          ? "当前部署环境不支持 TCP 检测"
          : target.label
            ? `${target.label} · 最近 ${MONITOR_BUCKETS} 小时`
            : `最近 ${MONITOR_BUCKETS} 小时`}
      </p>
    </section>
  );
}
