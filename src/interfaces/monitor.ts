/** 探测目标类型 */
export type MonitorType = "http" | "tcp";

/** 服务端探测目标（来自 config.toml 的 [[monitor.targets]] 或运行时环境变量） */
export interface MonitorTarget {
  id: string;
  name: string;
  type: MonitorType;
  /** HTTP 目标地址 */
  url?: string;
  /** TCP 目标主机 */
  host?: string;
  /** TCP 目标端口 */
  port?: number;
  /** HTTP 期望状态码（不填则 200-399 视为正常） */
  expectStatus?: number;
  /** 只认 https：跳转到 http 或本身就是明文则判为异常 */
  secure?: boolean;
  /** 顺带检查 TLS 证书剩余天数（仅 Node 系运行时可用） */
  checkCert?: boolean;
  /** 是否允许把 label 展示给前端（默认 false，避免主机名 / IP 泄漏） */
  showHost?: boolean;
  /** 展示用地址（http 取 host，tcp 取 host:port） */
  label: string;
}

/** 传给前端的目标信息（不含探测细节，也不含任何可能泄漏地址的字段） */
export interface PublicMonitorTarget {
  id: string;
  name: string;
  type: MonitorType;
  /** 允许展示时为地址文本，隐私开关关闭时为空字符串 */
  label: string;
}

/** 单次探测结果 */
export interface ProbeResult {
  id: string;
  ok: boolean;
  /** 建连 / 首字节耗时（ms），不支持或未探测时为 0 */
  ms: number;
  /** HTTP 状态码 */
  status?: number;
  /** 失败原因 */
  error?: string;
  /** TLS 证书剩余有效天数（仅开启 check_cert 且运行时支持时返回） */
  certDays?: number;
  /** 当前运行时无该类型检测能力（如边缘函数下的 TCP） */
  unsupported?: boolean;
}

/** /api/monitor 响应体 */
export interface MonitorResponse {
  /** 采样时间戳 */
  ts: number;
  /** 监控总开关（运行时判定） */
  enabled: boolean;
  /** 页面标题（运行时判定） */
  title: string;
  /** 前端轮询间隔（秒，运行时判定） */
  interval: number;
  /** 当前运行时是否支持 TCP 检测 */
  tcp: boolean;
  /** 本次实际探测的目标清单（页面按此渲染，不依赖构建期注入） */
  targets: PublicMonitorTarget[];
  results: ProbeResult[];
}
