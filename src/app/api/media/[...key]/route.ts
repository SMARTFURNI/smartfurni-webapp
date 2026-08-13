import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getCrmSession, getStaffSession } from "@/lib/admin-auth";
import { getMediaObject, headMediaObject, isPublicMediaKey, normalizeMediaKey } from "@/lib/media-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function canReadPrivateMedia(): Promise<boolean> {
  return Boolean(await getAdminSession() || await getCrmSession() || await getStaffSession());
}

async function resolveReadableKey(segments: string[]): Promise<{ key: string; isPublic: boolean } | null> {
  const key = normalizeMediaKey(segments.join("/"));
  const isPublic = isPublicMediaKey(key);
  if (!isPublic && !(await canReadPrivateMedia())) return null;
  return { key, isPublic };
}

export async function HEAD(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  try {
    const { key: segments } = await params;
    const readable = await resolveReadableKey(segments);
    if (!readable) return new NextResponse(null, { status: 401 });
    const object = await headMediaObject(readable.key);
    const headers = new Headers({
      "Content-Type": object.ContentType || "application/octet-stream",
      "Content-Length": String(object.ContentLength || 0),
      "Accept-Ranges": "bytes",
      "Cache-Control": readable.isPublic
        ? object.CacheControl || "public, max-age=86400"
        : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (object.ETag) headers.set("ETag", object.ETag);
    return new NextResponse(null, { status: 200, headers });
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404 || (error as { name?: string }).name === "NoSuchKey") {
      return new NextResponse(null, { status: 404 });
    }
    console.error("[media] Không đọc được metadata object:", error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  try {
    const { key: segments } = await params;
    const readable = await resolveReadableKey(segments);
    if (!readable) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const range = request.headers.get("range") || undefined;
    const object = await getMediaObject(readable.key, range);
    if (!object.Body) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const bytes = Buffer.from(await object.Body.transformToByteArray());
    const headers = new Headers({
      "Content-Type": object.ContentType || "application/octet-stream",
      "Content-Length": String(bytes.length),
      "Accept-Ranges": object.AcceptRanges || "bytes",
      "Cache-Control": readable.isPublic
        ? object.CacheControl || "public, max-age=31536000, immutable"
        : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (object.ETag) headers.set("ETag", object.ETag);
    if (object.ContentRange) headers.set("Content-Range", object.ContentRange);
    return new NextResponse(bytes, { status: object.ContentRange ? 206 : 200, headers });
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404 || (error as { name?: string }).name === "NoSuchKey") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[media] Không đọc được object:", error);
    return NextResponse.json({ error: "Không đọc được tệp" }, { status: 500 });
  }
}
