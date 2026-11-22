/** 心跳图保留最近 48 小时，每小时一个格子 */
export const MONITOR_BUCKETS = 48;
const HOUR = 3_600_000;

export interface MonitorBucket {
  ok: number;
  total: number;
}

/** id → 整点时间戳 → 该小时的采样统计 */
export type MonitorStore = Record<string, Record<string, MonitorBucket>>;

/** 服务端共享历史：所有设备看到同一份，不需等浏览器本地慢慢积累 */
let store: MonitorStore = {};

/** 把一次采样按整点聚合，并裁掉 48 小时之外的旧数据 */
export function recordSamples(results: { id: string; ok: boolean; unsupported?: boolean }[], now = Date.now()): void {
  const hour = Math.floor(now / HOUR) * HOUR;
  // 保留当前小时及往前 47 个小时，共 48 格
  const oldest = hour - (MONITOR_BUCKETS - 1) * HOUR;

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
}

/** 发给前端的快照；结构化克隆会复制对象，避免外部改动内部状态 */
export function getHistory(): MonitorStore {
  return JSON.parse(JSON.stringify(store)) as MonitorStore;
}
