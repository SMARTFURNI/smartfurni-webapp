import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getCrmSession, getStaffSession } from "@/lib/admin-auth";
import { getMediaObject, isPublicMediaKey, normalizeMediaKey } from "@/lib/media-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function canReadPrivateMedia(): Promise<boolean> {
  return Boolean(await getAdminSession() || await getCrmSession() || await getStaffSession());
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  try {
    const { key: segments } = await params;
    const key = normalizeMediaKey(segments.join("/"));
    const isPublic = isPublicMediaKey(key);
    if (!isPublic && !(await canReadPrivateMedia())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const range = request.headers.get("range") || undefined;
    const object = await getMediaObject(key, range);
    if (!object.Body) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const bytes = Buffer.from(await object.Body.transformToByteArray());
    const headers = new Headers({
      "Content-Type": object.ContentType || "application/octet-stream",
      "Content-Length": String(bytes.length),
      "Accept-Ranges": object.AcceptRanges || "bytes",
      "Cache-Control": isPublic
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
