// @ts-check
/**
 * ESA 边缘函数 — 替代 SSR 版 /api/bili-api（头像代理 + 直播间状态检测）
 *
 * ER 运行时为 Web Worker 风格（fetch/Request/Response），无 Node Buffer/process，
 * 头像响应用 Response 直接接收 body 流。与 src/pages/api/bili-api.ts 逻辑保持一致。
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

let buvidCookie = "";
let cachedFace = "";
let cachedUid = "";

async function getBuvidCookie(): Promise<string> {
  if (buvidCookie) return buvidCookie;
  try {
    const home = await fetch("https://www.bilibili.com/", {
      headers: { "User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9" },
    });
    const gsc = (home.headers as any).getSetCookie;
    const jar: string[] =
      typeof gsc === "function"
        ? gsc.call(home.headers)
        : home.headers.get("set-cookie")
          ? [home.headers.get("set-cookie")!]
          : [];
    const buvid = jar.find((c) => c.startsWith("buvid3"))?.split(";")[0];
    if (buvid) buvidCookie = buvid;
  } catch {
    /* ignore */
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

async function parseBiliJson(res: Response): Promise<any | null> {
  try {
    return JSON.parse(await res.text());
  } catch {
    return null;
  }
}

// 头像：仅走 x/web-interface/card 取 data.card.face
async function getFaceUrl(uid: string): Promise<string> {
  if (cachedUid === uid && cachedFace) return cachedFace;
  for (let i = 0; i < 2; i++) {
    const headers = await buildHeaders("https://space.bilibili.com/");
    const json = await parseBiliJson(
      await fetch(`https://api.bilibili.com/x/web-interface/card?mid=${uid}`, { headers })
    );
    const face = json?.code === 0 ? json.data?.card?.face || "" : "";
    if (face) {
      cachedFace = face;
      cachedUid = uid;
      return face;
    }
  }
  return "";
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/bili-api")) {
      return new Response("Not Found", { status: 404 });
    }
    const uid = url.searchParams.get("uid");
    if (!uid) {
      return new Response(JSON.stringify({ live: false }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 头像代理：成功返回图片字节，失败 404 交由前端回退 config.toml avatar 兜底
    if (url.searchParams.get("action") === "avatar") {
      const faceUrl = await getFaceUrl(uid);
      if (faceUrl) {
        const headers = await buildHeaders("https://space.bilibili.com/");
        const imgRes = await fetch(faceUrl, { headers });
        if (imgRes.ok) {
          return new Response(imgRes.body, {
            status: 200,
            headers: {
              "Content-Type": imgRes.headers.get("content-type") || "image/jpeg",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }
      return new Response("avatar unavailable", {
        status: 404,
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      });
    }

    // 直播状态：card 不含 live 信息，需单独查直播接口
    try {
      const headers = await buildHeaders("https://live.bilibili.com/");
      const json = await parseBiliJson(
        await fetch(
          `https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=${uid}`,
          { headers }
        )
      );
      const data = json?.code === 0 ? json.data : null;
      return new Response(
        JSON.stringify({ live: data?.liveStatus === 1, roomId: String(data?.roomid || "") }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch {
      return new Response(JSON.stringify({ live: false, roomId: "" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
