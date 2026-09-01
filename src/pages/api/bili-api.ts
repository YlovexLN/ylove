import type { APIRoute } from "astro";

export const prerender = false;

// B站 API 公共请求头：官方建议携带完整浏览器 UA（短 UA 易被风控识别为脚本，触发 -412），Referer 按接口域名匹配
const BILI_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept-Language": "zh-CN,zh;q=0.9",
};

// 直播检测缓存时长：5 分钟/次（README 承诺的限频，避免频繁调用触发 B站风控）
const LIVE_TTL = 5 * 60 * 1000;

let cachedFace = "";
let cachedUid = "";
let cachedLive: { live: boolean; roomId: string; time: number } | null = null;
let buvidCookie = "";

// 获取 B站 buvid3 cookie，用于规避风控（-352/-412）；失败不影响主流程
async function getBuvidCookie(): Promise<string> {
  if (buvidCookie) return buvidCookie;
  try {
    const home = await fetch("https://www.bilibili.com/", {
      headers: {
        "User-Agent": BILI_HEADERS["User-Agent"],
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
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
    // ignore
  }
  return buvidCookie;
}

async function getFaceUrl(uid: string): Promise<string> {
  if (cachedUid === uid && cachedFace) return cachedFace;
  try {
    const cookie = await getBuvidCookie();
    const res = await fetch(`https://api.bilibili.com/x/web-interface/card?mid=${uid}`, {
      headers: {
        ...BILI_HEADERS,
        Referer: "https://space.bilibili.com/",
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });
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

async function getLiveStatus(uid: string) {
  // 5 分钟内复用上次结果，减少 B站 API 调用（Worker 内存缓存，重部署后失效属正常）
  if (cachedLive && Date.now() - cachedLive.time < LIVE_TTL) return cachedLive;
  try {
    const roomRes = await fetch(`https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=${uid}`, {
      headers: { ...BILI_HEADERS, Referer: "https://live.bilibili.com/" },
    });
    const roomJson: any = await roomRes.json();
    const data = roomJson.data || {};
    cachedLive = {
      live: roomJson.code === 0 && data.liveStatus === 1,
      roomId: String(data.roomid || ""),
      time: Date.now(),
    };
  } catch {
    // 失败也缓存，避免风控/网络异常时每 5 分钟重试轰炸
    cachedLive = { live: false, roomId: "", time: Date.now() };
  }
  return cachedLive;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const uid = url.searchParams.get("uid");

  if (!uid) {
    return new Response(JSON.stringify({ live: false }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // 头像代理
  if (action === "avatar") {
    const faceUrl = await getFaceUrl(uid);
    if (!faceUrl) return new Response("", { status: 500 });
    try {
      const imgRes = await fetch(faceUrl, {
        headers: { ...BILI_HEADERS, Referer: "https://space.bilibili.com/" },
      });
      // 直接返回 ArrayBuffer（Cloudflare Workers 无 Buffer 全局对象，Node/Worker 均支持）
      const body = await imgRes.arrayBuffer();
      return new Response(body, {
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

  // 直播状态检测 — 通过 UID 自动查询直播间（5 分钟缓存）
  const { live, roomId } = await getLiveStatus(uid);
  return new Response(JSON.stringify({ live, roomId }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
};
