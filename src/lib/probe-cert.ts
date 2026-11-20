import { connect } from "node:tls";

/**
 * 读取站点 TLS 证书剩余有效天数（仅 Node 系运行时可用）
 *
 * 只用于「顺带提示」：拿不到证书（自签 / 非 https / 环境不支持）返回 null，
 * 不影响站点本身的可用性判定。
 */
export function probeCertDays(host: string, port: number, timeout: number): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false;
    const socket = connect({ host, port, servername: host, rejectUnauthorized: false });

    const finish = (days: number | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(days);
    };

    socket.setTimeout(timeout);
    socket.once("timeout", () => finish(null));
    socket.once("error", () => finish(null));
    socket.once("secureConnect", () => {
      try {
        const cert = socket.getPeerCertificate();
        const validTo = cert?.valid_to ? Date.parse(cert.valid_to) : NaN;
        finish(Number.isNaN(validTo) ? null : Math.floor((validTo - Date.now()) / 86_400_000));
      } catch {
        finish(null);
      }
    });
  });
}
