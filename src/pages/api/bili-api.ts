import type { APIRoute } from "astro";

export const prerender = false;

let cachedFace = "";
let cachedUid = "";

async function getFaceUrl(uid: string): Promise<string> {
  if (cachedUid === uid && cachedFace) return cachedFace;
  try {
    const res = await fetch(
      `https://api.bilibili.com/x/web-interface/card?mid=${uid}`,
      { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://space.bilibili.com/" } }
    );
    const json: any = await res.json();
    const face = json.code === 0 ? json.data?.card?.face || "" : "";
    if (face) { cachedFace = face; cachedUid = uid; }
    return face;
  } catch {
    return "";
  }
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
        headers: { "User-Agent": "Mozilla/5.0", Referer: "https://space.bilibili.com/" },
      });
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      return new Response(buffer, {
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

    return new Response(JSON.stringify({ live, roomId: resolvedRoomId }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ live: false, roomId: "" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
