import { createConnection } from "node:net";

/**
 * TCP 建连探测（仅 Node 系运行时可用）
 *
 * 只做「能否建立 TCP 连接」的判断，不发任何应用层协议数据：
 * 对 Minecraft / Source 等游戏服务器来说，端口能握手即代表服务在线。
 */
export function probeTcp(
  host: string,
  port: number,
  timeout: number
): Promise<{ ok: boolean; ms: number; error?: string }> {
  return new Promise((resolve) => {
    const started = Date.now();
    let settled = false;

    const socket = createConnection({ host, port });

    const finish = (ok: boolean, error?: string) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ok, ms: Date.now() - started, error });
    };

    socket.setTimeout(timeout);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false, "连接超时"));
    socket.once("error", (err: NodeJS.ErrnoException) => finish(false, err.code || err.message));
  });
}
