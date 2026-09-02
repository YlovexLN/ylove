/**
 * 浏览器端 B站客户端工具（仅浏览器运行 —— 请勿在构建 / SSR 期产生顶层副作用）
 *
 * 为什么需要它：
 *   站点若部署在 Cloudflare Workers 等服务端，服务器出口 IP 常被 B站风控屏蔽
 *   （如触发 -352 / 拿不到头像）。为绕开该问题，这里改为【在用户浏览器】用
 *   JSONP 直连 B站接口 ——
 *     - JSONP 通过 <script> 标签加载，不受浏览器 CORS 同源策略限制；
 *     - 请求发起方是用户的真实浏览器 IP，不会触发"Cloudflare IP"类风控；
 *     - 头像图片所在 CDN（*.hdslb.com）已返回 Access-Control-Allow-Origin: *
 *       （且 <img> 本就不受 CORS 限制），拿到 face URL 后可直接展示。
 *   B站相关接口已实测支持 JSONP（追加 ?jsonp=jsonp&callback=fn 即包裹返回）。
 */

/** 生成唯一的 JSONP 全局回调名 */
function uniqueCallback(): string {
  return `__bili_jsonp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 发起一次 JSONP 请求并返回解析后的 JSON（Promise）。
 * @param url 目标接口地址（无需自带 callback 参数，由本函数追加）
 * @param timeout 超时毫秒（默认 8000），避免 script 加载无响应卡住
 */
export function jsonp<T = unknown>(url: string, timeout = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // 仅在浏览器端可用（SSR / 构建期不执行）
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("jsonp 只能在浏览器端使用"));
      return;
    }

    const cbName = uniqueCallback();
    const sep = url.includes("?") ? "&" : "?";
    const script = document.createElement("script");
    let timer: number | undefined;
    let settled = false;

    const cleanup = () => {
      if (timer) window.clearTimeout(timer);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any)[cbName];
      } catch {
        /* 某些环境下 delete 失败可忽略 */
      }
      script.parentNode?.removeChild(script);
    };

    const finish = (fn: () => void) => () => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    // 挂载全局回调（B站会把数据包在 callback(...) 中）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[cbName] = (data: T) => finish(() => resolve(data))();

    script.onerror = () => finish(() => reject(new Error("B站 JSONP 脚本加载失败")))();
    timer = window.setTimeout(() => finish(() => reject(new Error("B站 JSONP 请求超时")))() as never, timeout);

    script.src = `${url}${sep}jsonp=jsonp&callback=${encodeURIComponent(cbName)}`;
    script.async = true;
    document.head.appendChild(script);
  });
}

/** 通过 card 接口取 B站用户头像（face）URL，失败 / 无头像返回空串 */
export async function getBiliFaceUrl(uid: number | string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await jsonp(
      `https://api.bilibili.com/x/web-interface/card?mid=${encodeURIComponent(String(uid))}`
    );
    if (data?.code === 0 && data?.data?.card?.face) {
      return data.data.card.face as string;
    }
    return "";
  } catch {
    return "";
  }
}

/** 获取 B站用户直播状态（是否在播 + 房间号），失败返回未开播 */
export async function getBiliLiveStatus(
  uid: number | string
): Promise<{ live: boolean; roomId: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await jsonp(
      `https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=${encodeURIComponent(String(uid))}`
    );
    const d = data?.data;
    const inRoom = data?.code === 0 && d && d.roomStatus === 1;
    return {
      live: !!(inRoom && d.liveStatus === 1),
      roomId: String(d?.roomid || ""),
    };
  } catch {
    return { live: false, roomId: "" };
  }
}
