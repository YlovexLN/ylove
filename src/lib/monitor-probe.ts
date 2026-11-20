import type { MonitorTarget, ProbeResult } from "@/interfaces/monitor";

/** 探测请求 UA：部分站点会直接拒绝无 UA 的请求，误判成宕机 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

/**
 * 当前运行时是否具备原生 TCP 能力。
 * Node / Netlify Functions 有；ESA 这类边缘 Worker 没有 raw socket。
 */
export function tcpSupported(): boolean {
  return typeof process !== "undefined" && Boolean(process.versions?.node);
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return value.startsWith("https://");
  }
}

/** 证书剩余天数：拿不到就返回 null，绝不因此把站点判成故障 */
async function readCertDays(finalUrl: string, timeout: number): Promise<number | null> {
  if (!tcpSupported()) return null;
  try {
    const parsed = new URL(finalUrl);
    if (parsed.protocol !== "https:") return null;
    const { probeCertDays } = await import("./probe-cert");
    return await probeCertDays(parsed.hostname, parsed.port ? Number(parsed.port) : 443, timeout);
  } catch {
    return null;
  }
}

/** HTTP 探测：只等到响应头就取消 body，避免把整页内容拉下来 */
async function probeHttp(target: MonitorTarget, timeout: number): Promise<ProbeResult> {
  const url = target.url as string;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "*/*",
        "Cache-Control": "no-cache",
      },
    });
    const ms = Date.now() - started;
    const finalUrl = res.url || url;

    // 不读取响应体：状态码已经足够判断可用性
    try {
      await res.body?.cancel();
    } catch {
      /* 部分运行时 body 不可取消，忽略 */
    }

    const ok =
      target.expectStatus !== undefined
        ? res.status === target.expectStatus
        : res.status >= 200 && res.status < 400;

    // secure：最终落地地址必须是 https（跟随跳转后判断，防止被降到明文）
    if (ok && target.secure && !isHttpsUrl(finalUrl)) {
      return { id: target.id, ok: false, ms, status: res.status, error: "未使用 HTTPS" };
    }

    const result: ProbeResult = { id: target.id, ok, ms, status: res.status };

    if (ok && target.checkCert) {
      const days = await readCertDays(finalUrl, timeout);
      if (days !== null) result.certDays = days;
    }

    return result;
  } catch (err) {
    const ms = Date.now() - started;
    const name = (err as Error)?.name;
    return {
      id: target.id,
      ok: false,
      ms,
      error: name === "AbortError" || name === "TimeoutError" ? "请求超时" : "无法连接",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** TCP 探测：运行时没有 net 模块时标记 unsupported，而不是算作故障 */
async function probeTcpTarget(target: MonitorTarget, timeout: number): Promise<ProbeResult> {
  if (!tcpSupported() || !target.host || !target.port) {
    return { id: target.id, ok: false, ms: 0, unsupported: true };
  }

  try {
    // 动态引入：没有 node:net 的运行时不会因此报错，只是走上面的 unsupported 分支
    const { probeTcp } = await import("./probe-tcp");
    const result = await probeTcp(target.host, target.port, timeout);
    return { id: target.id, ...result };
  } catch {
    return { id: target.id, ok: false, ms: 0, unsupported: true };
  }
}

/** 并发探测所有目标（每个目标独立超时，互不阻塞） */
export function probeTargets(targets: MonitorTarget[], timeout: number): Promise<ProbeResult[]> {
  return Promise.all(
    targets.map((target) =>
      target.type === "tcp" ? probeTcpTarget(target, timeout) : probeHttp(target, timeout)
    )
  );
}
