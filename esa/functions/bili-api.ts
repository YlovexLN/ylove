// @ts-check
/// <reference types="node" />
/**
 * ESA 边缘函数入口 — 替代 SSR 版 /api/bili-api（头像代理 + 直播状态检测）
 *
 * 部署模型：函数 + Pages 混合项目（配置见根目录 esa.jsonc）
 *  - entry：本文件，处理未命中静态资源的请求
 *  - assets.directory：./dist，静态页面托管
 * 路由：静态资源优先 → 未命中再执行本函数（参见 ESA 文档「静态资源的路由」）
 *
 * 注意：ER 运行时为 Web Worker API 风格（fetch / Request / Response），
 * 无 Node.js 的 Buffer / process，因此头像响应改用 Response 直接接收 body 流。
 * 与 SSR 版 src/pages/api/bili-api.ts 逻辑保持一致，含 buvid3 cookie 握手以规避风控。
 */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

let cachedFace = "";
let cachedUid = "";
let buvidCookie = "";

// 获取 B站匿名访客标识 buvid3 cookie（服务端主动请求首页，由 B站 set-cookie 下发）
async function getBuvidCookie(): Promise<string> {
  if (buvidCookie) return buvidCookie;
  try {
    const home = await fetch("https://www.bilibili.com/", {
      headers: { "User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9" },
    });
    // getSetCookie 在最新运行时支持，旧环境回退到 get("set-cookie")
    const getSetCookie = (home.headers as any).getSetCookie;
    const jar: string[] =
      typeof getSetCookie === "function"
        ? getSetCookie.call(home.headers)
        : home.headers.get("set-cookie")
          ? [home.headers.get("set-cookie")!]
          : [];
    const buvid = jar.find((c) => c.startsWith("buvid3"))?.split(";")[0];
    if (buvid) buvidCookie = buvid;
  } catch {
    // ignore —— 失败不影响主流程
  }
  return buvidCookie;
}

async function buildHeaders(referer: string): Promise<Record<string, string>> {
  const cookie = await getBuvidCookie();
  return {
    "User-Agent": UA,
    Referer: referer,
    "Accept-Language": "zh-CN,zh;q=0.9",
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

async function getFaceUrl(uid: string): Promise<string> {
  if (cachedUid === uid && cachedFace) return cachedFace;
  try {
    const headers = await buildHeaders("https://space.bilibili.com/");
    const res = await fetch(
      `https://api.bilibili.com/x/web-interface/card?mid=${uid}`,
      { headers }
    );
    const json: any = await res.json();
    const face = json.code === 0 ? json.data?.card?.face || "" : "";
    if (face) {
      cachedFace = face;
      cachedUid = uid;
    }
    return face;
  } catch {
    return "";
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 仅处理 /api/bili-api，其余未命中静态资源的请求统一 404
    if (!url.pathname.startsWith("/api/bili-api")) {
      return new Response("Not Found", { status: 404 });
    }

    const action = url.searchParams.get("action");
    const uid = url.searchParams.get("uid");

    if (!uid) {
      return new Response(JSON.stringify({ live: false }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 头像代理
    if (action === "avatar") {
      const faceUrl = await getFaceUrl(uid);
      if (!faceUrl) return new Response("", { status: 500 });
      try {
        const headers = await buildHeaders("https://space.bilibili.com/");
        const imgRes = await fetch(faceUrl, { headers });
        return new Response(imgRes.body, {
          status: 200,
          headers: {
            "Content-Type": imgRes.headers.get("content-type") || "image/jpeg",
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch {
        return new Response("", { status: 500 });
      }
    }

    // 直播状态检测 — 通过 UID 自动查询直播间
    try {
      let live = false;
      let resolvedRoomId = "";

      const headers = await buildHeaders("https://live.bilibili.com/");
      const roomRes = await fetch(
        `https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=${uid}`,
        { headers }
      );
      const roomJson: any = await roomRes.json();
      if (roomJson.code === 0 && roomJson.data) {
        resolvedRoomId = String(roomJson.data.roomid || "");
        live = roomJson.data.liveStatus === 1;
      }

      return new Response(JSON.stringify({ live, roomId: resolvedRoomId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ live: false, roomId: "" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
