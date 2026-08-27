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
 * 无 Node.js 的 Buffer / process，因此头像响应改用 Response 直接接收 body 流，
 * 其余逻辑与 src/pages/api/bili-api.ts 保持一致。
 */
const BILI_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Referer: "https://space.bilibili.com/",
};

let cachedFace = "";
let cachedUid = "";

async function getFaceUrl(uid: string): Promise<string> {
  if (cachedUid === uid && cachedFace) return cachedFace;
  try {
    const res = await fetch(
      `https://api.bilibili.com/x/web-interface/card?mid=${uid}`,
      { headers: BILI_HEADERS }
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
        const imgRes = await fetch(faceUrl, { headers: BILI_HEADERS });
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

      const roomRes = await fetch(
        `https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=${uid}`,
        { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://live.bilibili.com/" } }
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
