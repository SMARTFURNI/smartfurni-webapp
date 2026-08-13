/**
 * GET /api/crm/zalo-inbox/video-proxy?url=<encoded_url>
 *
 * Zalo's download CDN marks native videos as attachments. Browsers can then
 * download the same URL successfully while an HTML5 <video> remains at 0:00.
 * Proxy the response as inline media and preserve byte ranges for seeking.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_VIDEO_HOSTS = [
  "zalo.me",
  "zadn.vn",
  "zdn.vn",
  "dlfl.vn",
  "dlmd.me",
];

function isAllowedVideoUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return ALLOWED_VIDEO_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!await canAccessZaloInbox(session)) {
    return new NextResponse("Forbidden", { status: session ? 403 : 401 });
  }

  const videoUrl = new URL(req.url).searchParams.get("url") || "";
  if (!videoUrl) return new NextResponse("Missing url parameter", { status: 400 });
  if (!isAllowedVideoUrl(videoUrl)) return new NextResponse("URL not allowed", { status: 403 });

  try {
    const range = req.headers.get("range");
    const upstream = await fetch(videoUrl, {
      redirect: "follow",
      headers: {
        Referer: "https://chat.zalo.me/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        ...(range ? { Range: range } : {}),
      },
    });

    if (!upstream.ok || !upstream.body) {
      console.error(`[video-proxy] Failed to fetch ${videoUrl}: ${upstream.status}`);
      return new NextResponse(`Video fetch failed: ${upstream.status}`, { status: upstream.status });
    }

    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") || "video/mp4",
      "Content-Disposition": "inline",
      "Accept-Ranges": upstream.headers.get("accept-ranges") || "bytes",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error("[video-proxy] Error:", error);
    return new NextResponse("Proxy error", { status: 502 });
  }
}
