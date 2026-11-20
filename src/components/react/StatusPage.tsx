import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { faArrowRotateRight, faHeartPulse } from "@fortawesome/free-solid-svg-icons";
import type { MonitorResponse, ProbeResult, PublicMonitorTarget } from "@/interfaces/monitor";

const HOUR = 3_600_000;
/** 心跳图保留最近 48 小时，每小时一个格子 */
const BUCKETS = 48;
const STORE_KEY = "ylove:monitor:v1";

interface Bucket {
  /** 成功次数 */
  ok: number;
  /** 采样总数 */
  total: number;
}

/** id → 小时时间戳 → 该小时的采样统计 */
type Store = Record<string, Record<string, Bucket>>;

function readStore(): Store {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* 隐私模式 / 配额满时静默失败，页面仍显示实时状态 */
  }
}

/** 把一次采样累加到所属小时，并裁掉 48 小时之外的旧数据 */
function accumulate(store: Store, results: ProbeResult[], now: number): Store {
  const hour = Math.floor(now / HOUR) * HOUR;
  const oldest = hour - (BUCKETS - 1) * HOUR;

  for (const result of results) {
    if (result.unsupported) continue;
    const byHour = (store[result.id] ||= {});
    const bucket = (byHour[hour] ||= { ok: 0, total: 0 });
    bucket.total += 1;
    if (result.ok) bucket.ok += 1;
  }

  for (const id of Object.keys(store)) {
    for (const key of Object.keys(store[id])) {
      if (Number(key) < oldest) delete store[id][key];
    }
  }
  return store;
}

/** 每个格子的配色：全绿=正常，偏黄=有零星失败，红=失败过半，灰=无数据 */
function bucketTone(bucket?: Bucket): string {
  if (!bucket || bucket.total === 0) return "bg-white/8";
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
  const [store, setStore] = useState<Store>({});
  const [mounted, setMounted] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  // 首次成功取到结果后置真：用于区分「还没探测」与「当前环境没配置这个节点」
  const [loaded, setLoaded] = useState(false);
  // 运行时开关：平台侧关掉监控时页面只提示，不显示任何节点
  const [enabled, setEnabled] = useState(true);
  // 配置有误时的提示（如 MONITOR_TARGETS 不是合法 JSON）
  const [warning, setWarning] = useState("");

  const tick = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/monitor", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as MonitorResponse;

      setTitle(data.title);
      setIntervalValue(data.interval);
      setEnabled(data.enabled !== false);
      setWarning(data.warning || "");
      setTargets(data.targets || []);
      setResults(Object.fromEntries(data.results.map((r) => [r.id, r])));
      setUpdatedAt(data.ts);
      setOffline(false);
      setLoaded(true);

      const next = accumulate(readStore(), data.results, Date.now());
      writeStore(next);
      setStore(next);
    } catch {
      setOffline(true);
      setLoaded(true);
    } finally {
      setBusy(false);
    }
  }, []);

  // 轮询间隔来自接口（运行时可配），先用一个保守默认值，等首次响应后再调整
  useEffect(() => {
    setMounted(true);
    setStore(readStore());
    tick();
  }, [tick]);

  useEffect(() => {
    const timer = setInterval(tick, interval * 1000);
    return () => clearInterval(timer);
  }, [tick, interval]);

  // 每小时的格子时间轴（最新一小时在右端），随采样更新时间刷新
  const hours = useMemo(() => {
    const end = Math.floor(Date.now() / HOUR) * HOUR;
    return Array.from({ length: BUCKETS }, (_, i) => end - (BUCKETS - 1 - i) * HOUR);
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
                ? `最近更新 ${formatTime(updatedAt)} · 每 ${interval} 秒自动检测`
                : "正在检测…"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={tick} disabled={busy}>
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
              buckets={mounted ? hours.map((h) => store[target.id]?.[h]) : []}
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
  /** 是否已收到过至少一次探测结果 */
  loaded: boolean;
  buckets: (Bucket | undefined)[];
  hours: number[];
}

function TargetCard({ target, result, loaded, buckets, hours }: CardProps) {
  // 页面按接口返回的清单渲染；当前环境没配置该节点时给出明确提示
  const missing = loaded && !result;
  const sampled = buckets.filter((b): b is Bucket => Boolean(b?.total));
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
        {(buckets.length ? buckets : Array.from({ length: BUCKETS }, () => undefined)).map(
          (bucket, i) => (
            <div
              key={i}
              className={`min-w-0 flex-1 rounded-full ${bucketTone(bucket)}`}
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
            ? `${target.label} · 最近 ${BUCKETS} 小时`
            : `最近 ${BUCKETS} 小时`}
      </p>
    </section>
  );
}
