/**
 * GET /api/crm/zalo-inbox/image-proxy?url=<encoded_url>
 * Proxy ảnh từ Zalo CDN về client.
 * Zalo CDN yêu cầu Referer header từ zalo.me — browser load trực tiếp sẽ bị 403.
 * Route này tải ảnh từ server (có thể set Referer tùy ý) rồi stream về client.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Chỉ cho phép proxy ảnh từ Zalo CDN
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  const allowedHosts = [
    "zalo.me", "zadn.vn", "chat.zalo.me", "stc-zaloprofile.zdn.vn",
    "s240-ava.zadn.vn", "s120-ava.zadn.vn", "s480-ava.zadn.vn",
    "imga.zadn.vn", "imgb.zadn.vn", "imgc.zadn.vn", "imgd.zadn.vn",
    "imge.zadn.vn", "imgf.zadn.vn", "imgg.zadn.vn",
    "cover.zadn.vn", "thumb.zadn.vn",
  ];
  const isAllowed = allowedHosts.some(
    (host) => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
  );
  if (!isAllowed) {
    return new NextResponse("URL not allowed", { status: 403 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        "Referer": "https://chat.zalo.me/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "sec-fetch-dest": "image",
        "sec-fetch-mode": "no-cors",
        "sec-fetch-site": "cross-site",
      },
    });

    if (!response.ok) {
      console.error(`[image-proxy] Failed to fetch ${imageUrl}: ${response.status}`);
      return new NextResponse(`Image fetch failed: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[image-proxy] Error:", err);
    return new NextResponse("Proxy error", { status: 500 });
  }
}
