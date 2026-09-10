import type { APIRoute } from "astro";

export const prerender = false;

// B站 API 公共请求头：官方建议携带完整浏览器 UA（短 UA 易被识别为脚本触发 -412）
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

// 头像 / 直播共用缓存 + buvid3 cookie 握手，规避数据中心 IP 风控（-352/-412）
const LIVE_TTL = 5 * 60 * 1000; // 直播检测 5 分钟限频

let buvidCookie = ""; // B站匿名访客标识，服务端请求首页 set-cookie 下发，缓存复用
let cachedFace = "";
let cachedUid = "";
let cachedLive: { live: boolean; roomId: string; time: number } | null = null;

/** 获取匿名 buvid3 cookie（失败不影响主流程，仅少 cookie 时可能被风控） */
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

/** 构造带 buvid3 cookie 的请求头 */
async function buildHeaders(referer: string): Promise<Record<string, string>> {
  const cookie = await getBuvidCookie();
  return {
    "User-Agent": UA,
    Referer: referer,
    "Accept-Language": "zh-CN,zh;q=0.9",
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

/** 解析 B站 JSON 响应；非 JSON（-412 风控页/HTML）返回 null */
async function parseBiliJson(res: Response): Promise<any | null> {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ===== 头像：仅走 x/web-interface/card，取 data.card.face =====
async function getFaceUrl(uid: string): Promise<string> {
  if (cachedUid === uid && cachedFace) return cachedFace;
  // 一次重试规避数据中心 IP 偶发风控；失败返回 ""，交由前端 config avatar 兜底
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

// ===== 直播间状态：card 接口不含 live 信息，需单独查直播接口（5 分钟缓存） =====
async function getLiveStatus(uid: string) {
  if (cachedLive && Date.now() - cachedLive.time < LIVE_TTL) return cachedLive;
  const headers = await buildHeaders("https://live.bilibili.com/");
  const json = await parseBiliJson(
    await fetch(
      `https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=${uid}`,
      { headers }
    )
  );
  const data = json?.code === 0 ? json.data : null;
  // 无论成败都写入缓存，避免失败时每 5 分钟反复轰炸
  cachedLive = {
    live: data?.liveStatus === 1,
    roomId: String(data?.roomid || ""),
    time: Date.now(),
  };
  return cachedLive;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const uid = url.searchParams.get("uid");
  if (!uid) {
    return new Response(JSON.stringify({ live: false }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 头像代理：拿真实头像字节返回。失败返回 404，交由前端 <img> onError
  // 回退到 config.toml 的 avatar 兜底，保证不裂图空白。
  if (url.searchParams.get("action") === "avatar") {
    const faceUrl = await getFaceUrl(uid);
    if (faceUrl) {
      const headers = await buildHeaders("https://space.bilibili.com/");
      const imgRes = await fetch(faceUrl, { headers });
      if (imgRes.ok) {
        return new Response(await imgRes.arrayBuffer(), {
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

  // 直播状态检测
  const { live, roomId } = await getLiveStatus(uid);
  return new Response(JSON.stringify({ live, roomId }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
};
