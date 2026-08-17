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
import { downloadCrmRecording } from "@/lib/crm-recording";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const debug = req.nextUrl.searchParams.get("debug") === "1";
  const targetUrl = req.nextUrl.searchParams.get("url");
  if (!targetUrl) {
    return new NextResponse("Invalid recording URL", { status: 400 });
  }

  let recording: Awaited<ReturnType<typeof downloadCrmRecording>>;
  try {
    recording = await downloadCrmRecording(targetUrl);
  } catch (err) {
    console.error("[hotline recording proxy] Fetch error:", err);
    const message = err instanceof Error ? err.message : "Không thể tải bản ghi âm";
    if (debug) return NextResponse.json({ ok: false, message }, { status: 502 });
    return new NextResponse(message, { status: 502 });
  }

  if (debug) return NextResponse.json({
    ok: true,
    status: 200,
    contentType: recording.contentType,
    contentLength: recording.buffer.length,
    playable: true,
    message: "Server đã tải và nhận diện được file ghi âm.",
  });

  const total = recording.buffer.length;
  const range = req.headers.get("range");
  let start = 0;
  let end = total - 1;
  let status = 200;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
    if (!match) return new NextResponse("Invalid range", { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    if (match[1]) start = Number(match[1]);
    if (match[2]) end = Number(match[2]);
    if (!match[1] && match[2]) {
      const suffixLength = Number(match[2]);
      start = Math.max(0, total - suffixLength);
      end = total - 1;
    }
    end = Math.min(end, total - 1);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= total) {
      return new NextResponse("Range not satisfiable", { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    }
    status = 206;
  }
  const body = recording.buffer.subarray(start, end + 1);
  const responseHeaders = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "Content-Disposition": `inline; filename="${recording.filename}"`,
    "Content-Length": String(body.length),
    "Content-Type": recording.contentType,
  });
  if (status === 206) responseHeaders.set("Content-Range", `bytes ${start}-${end}/${total}`);

  return new NextResponse(new Uint8Array(body), {
    status,
    headers: responseHeaders,
  });
}
