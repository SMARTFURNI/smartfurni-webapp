/**
 * GET /api/crm/hotline-inbound/recording?url=<encoded_url>
 * Proxy file ghi âm từ tổng đài về cùng domain CRM.
 *
 * Một số hệ thống tổng đài không cho thẻ <audio> đọc trực tiếp do CORS,
 * redirect hoặc thiếu header Range. Route này tải file ở server rồi stream
 * lại cho browser để player đọc metadata và tua file ổn định hơn.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseAllowedRecordingUrl(rawUrl: string | null): URL | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    const hostname = url.hostname.toLowerCase();
    const allowed = hostname === "ity.vn" || hostname.endsWith(".ity.vn");
    return allowed ? url : null;
  } catch {
    return null;
  }
}

function copyHeader(from: Headers, to: Headers, key: string) {
  const value = from.get(key);
  if (value) to.set(key, value);
}

function isPlayableContentType(contentType: string) {
  const lower = contentType.toLowerCase();
  return (
    lower.startsWith("audio/") ||
    lower.includes("mpeg") ||
    lower.includes("wav") ||
    lower.includes("ogg") ||
    lower.includes("octet-stream")
  );
}

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const debug = req.nextUrl.searchParams.get("debug") === "1";
  const targetUrl = parseAllowedRecordingUrl(req.nextUrl.searchParams.get("url"));
  if (!targetUrl) {
    return new NextResponse("Invalid recording URL", { status: 400 });
  }

  const headers = new Headers({
    "Accept": "audio/*,application/octet-stream,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    "User-Agent": "Mozilla/5.0 (compatible; SmartFurniCRM/1.0)",
  });

  // Trình duyệt gửi Range khi cần đọc metadata hoặc tua file.
  // Chuyển tiếp header này giúp audio player không bị kẹt thời lượng 0:00.
  const range = req.headers.get("range");
  if (range) headers.set("Range", range);
  if (debug && !range) headers.set("Range", "bytes=0-0");

  let response: Response;
  try {
    response = await fetch(targetUrl.toString(), {
      headers,
      redirect: "follow",
      cache: "no-store",
    });
  } catch (err) {
    console.error("[hotline recording proxy] Fetch error:", err);
    return new NextResponse("Cannot fetch recording", { status: 502 });
  }

  const contentType = response.headers.get("content-type") || "";
  const contentLength = response.headers.get("content-length");
  const playable = isPlayableContentType(contentType);

  if (debug) {
    return NextResponse.json({
      ok: response.ok || response.status === 206,
      status: response.status,
      contentType: contentType || "không có content-type",
      contentLength: contentLength || "không có content-length",
      playable,
      message: !response.ok && response.status !== 206
        ? `Tổng đài trả về lỗi ${response.status}.`
        : playable
          ? "Server đọc được file ghi âm."
          : "Tổng đài không trả về file âm thanh, có thể đang trả về trang đăng nhập hoặc HTML.",
    });
  }

  if (!response.ok && response.status !== 206) {
    console.error(
      `[hotline recording proxy] Remote error ${response.status}: ${targetUrl.toString()}`
    );
    return new NextResponse(`Recording fetch failed: ${response.status}`, { status: 502 });
  }

  if (!playable) {
    console.error(
      `[hotline recording proxy] Non-audio response ${contentType || "unknown"}: ${targetUrl.toString()}`
    );
    return new NextResponse("Recording URL did not return an audio file", { status: 502 });
  }

  if (!response.body) {
    return new NextResponse("Recording body is empty", { status: 502 });
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", contentType || "audio/mpeg");
  responseHeaders.set("Cache-Control", "private, max-age=300");
  responseHeaders.set("Accept-Ranges", response.headers.get("accept-ranges") || "bytes");
  copyHeader(response.headers, responseHeaders, "content-length");
  copyHeader(response.headers, responseHeaders, "content-range");
  copyHeader(response.headers, responseHeaders, "content-disposition");

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
