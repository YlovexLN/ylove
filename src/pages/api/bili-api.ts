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

// 头像代理拿不到真实头像（数据中心出口 IP 被 B站 -412/-352 风控）时的内置兜底头像。
// public/avatars/avatar.jpg 作为站点静态资源由平台托管，返回 302 重定向，客户端/img 会自动跟随成 200。
// 与前端 Hero 的 onError 兜底（config.toml avatar = "/avatars/avatar.jpg"）共用同一份资源。
const FALLBACK_AVATAR = "/avatars/avatar.jpg";

// 出口网络可用但 B站接口抖动时做一次重试，提升成功率（数据中心 IP 偶发风控）
const MAX_ATTEMPTS = 2;

let cachedFace = "";
let cachedUid = "";
let cachedLive: { live: boolean; roomId: string; time: number } | null = null;
let buvidCookie = "";

// 获取 B站匿名访客标识 buvid3 cookie（服务端主动请求首页，由 B站 set-cookie 下发）
// 数据中心出口 IP（如 Cloudflare Worker）无此标识时调 API 易触发 -352/-412；成功获取后内存缓存复用
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
    // ignore —— 失败不影响主流程，仅少了 cookie 可能被风控
  }
  return buvidCookie;
}

/** 构造带 buvid3 cookie（如有）的请求头 */
async function buildHeaders(referer: string): Promise<Record<string, string>> {
  const cookie = await getBuvidCookie();
  return {
    ...BILI_HEADERS,
    Referer: referer,
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

// 从 B站用户空间 card 接口拿头像 URL（主来源）。
// 数据中心 IP 被风控（-412 / -352 / 非 JSON）时可能拿不到，交由上层走 live 接口兜底。
// 增加一次重试规避偶发风控；内部异常不抛出。
async function getFaceFromCard(uid: string): Promise<string> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const headers = await buildHeaders("https://space.bilibili.com/");
      const res = await fetch(`https://api.bilibili.com/x/web-interface/card?mid=${uid}`, {
        headers,
      });
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        // 响应非 JSON（如 -412 风控校验页/HTML），视为失败，走重试
        continue;
      }
      const face =
        json?.code === 0 && json.data?.card?.face
          ? json.data.card.face
          : "";
      if (face) return face;
    } catch {
      // 网络异常，下一轮重试
    }
  }
  return "";
}

// 从 B站直播 Master/info 接口拿头像 URL（兜底来源）。
// 该接口相对开放、匿名（无需 buvid3 cookie）即可访问，数据中心 IP 也不易触发 -412，
// 可作为 card 接口被风控时的可靠兜底。返回 data.info.face。
async function getFaceFromLive(uid: string): Promise<string> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const headers = await buildHeaders("https://live.bilibili.com/");
      const res = await fetch(
        `https://api.live.bilibili.com/live_user/v1/Master/info?uid=${uid}`,
        { headers }
      );
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        // 响应非 JSON，视为失败，走重试
        continue;
      }
      const face =
        json?.code === 0 && json.data?.info?.face
          ? json.data.info.face
          : "";
      if (face) return face;
    } catch {
      // 网络异常，下一轮重试
    }
  }
  return "";
}

// 依次尝试 card → live 两个来源取头像 URL，命中即缓存返回。
// 两个来源都无法获取（B站接口风控 / 网络异常 / UID 无数据）时返回空字符串，
// 由 avatar handler 降级为本地静态头像兜底，保证接口绝不 500 / 裂图。
async function getFaceUrl(uid: string): Promise<string> {
  if (cachedUid === uid && cachedFace) return cachedFace;
  const face = (await getFaceFromCard(uid)) || (await getFaceFromLive(uid));
  if (face) {
    cachedFace = face;
    cachedUid = uid;
  }
  return face;
}

async function getLiveStatus(uid: string) {
  // 5 分钟内复用上次结果，减少 B站 API 调用（Worker 内存缓存，重部署后失效属正常）
  if (cachedLive && Date.now() - cachedLive.time < LIVE_TTL) return cachedLive;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const headers = await buildHeaders("https://live.bilibili.com/");
      const roomRes = await fetch(`https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=${uid}`, {
        headers,
      });
      const text = await roomRes.text();
      let roomJson: any = null;
      try {
        roomJson = JSON.parse(text);
      } catch {
        continue;
      }
      const data = roomJson?.data || {};
      if (roomJson?.code === 0 && data) {
        cachedLive = {
          live: data.liveStatus === 1,
          roomId: String(data.roomid || ""),
          time: Date.now(),
        };
        return cachedLive;
      }
    } catch {
      // 网络异常，下一轮重试
    }
  }
  // 仍失败才缓存兜底结果，避免每 5 分钟重试轰炸
  cachedLive = { live: false, roomId: "", time: Date.now() };
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
    try {
      const faceUrl = await getFaceUrl(uid);
      if (faceUrl) {
        const headers = await buildHeaders("https://space.bilibili.com/");
        const imgRes = await fetch(faceUrl, { headers });
        if (imgRes.ok) {
          // 直接返回 ArrayBuffer（Cloudflare Workers 无 Buffer 全局对象，Node/Worker 均支持）
          const body = await imgRes.arrayBuffer();
          return new Response(body, {
            status: 200,
            headers: {
              "Content-Type": imgRes.headers.get("content-type") || "image/jpeg",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }
    } catch {
      // 抓真实头像整体失败，落到下方静态兜底，保证接口稳定返回而非 500
    }
    // 拿不到真实头像 / 抓图失败 → 重定向到内置静态头像（客户端自动跟随成 200，页面不裂图）
    return new Response(null, {
      status: 302,
      headers: {
        Location: FALLBACK_AVATAR,
        "Cache-Control": "no-store",
      },
    });
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
