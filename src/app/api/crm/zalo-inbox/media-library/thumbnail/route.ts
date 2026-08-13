import { NextRequest, NextResponse } from "next/server";

import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import { getMediaObject, setMediaRetained, storeMediaObject } from "@/lib/media-storage";
import { getZaloMediaAsset } from "@/lib/zalo-media-library-store";
import {
  createZaloMediaThumbnail,
  createZaloVideoThumbnail,
  getZaloMediaThumbnailKey,
  ZALO_MEDIA_THUMBNAIL_CACHE_CONTROL,
} from "@/lib/zalo-media-thumbnails";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isMissingObject(error: unknown): boolean {
  const value = error as { $metadata?: { httpStatusCode?: number }; name?: string };
  return value.$metadata?.httpStatusCode === 404 || value.name === "NoSuchKey";
}

async function objectBytes(key: string): Promise<Buffer> {
  const object = await getMediaObject(key);
  if (!object.Body) throw new Error("Media object không có nội dung");
  return Buffer.from(await object.Body.transformToByteArray());
}

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!(await canAccessZaloInbox(session))) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });
  }

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Thiếu tài liệu" }, { status: 400 });

  try {
    const asset = await getZaloMediaAsset(id);
    if (!asset || (asset.mediaKind !== "image" && asset.mediaKind !== "video")) {
      return NextResponse.json({ error: "Không tìm thấy media" }, { status: 404 });
    }

    const thumbnailKey = getZaloMediaThumbnailKey(asset.id);
    let bytes: Buffer;
    try {
      bytes = await objectBytes(thumbnailKey);
    } catch (error) {
      if (!isMissingObject(error)) throw error;
      const source = await objectBytes(asset.objectKey);
      bytes = asset.mediaKind === "video"
        ? await createZaloVideoThumbnail(source)
        : await createZaloMediaThumbnail(source);
      await storeMediaObject({
        body: bytes,
        key: thumbnailKey,
        contentType: "image/webp",
        visibility: "private",
        cacheControl: ZALO_MEDIA_THUMBNAIL_CACHE_CONTROL,
        originalName: `${asset.id}.webp`,
        entityType: "zalo_media_thumbnail",
        entityId: asset.id,
        createdBy: session?.staffId || (session?.isAdmin ? "admin" : "system"),
      });
      await setMediaRetained(thumbnailKey, true, session?.staffId || "system");
    }

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(bytes.length),
        "Cache-Control": ZALO_MEDIA_THUMBNAIL_CACHE_CONTROL,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[zalo-media-library] thumbnail error:", error);
    return NextResponse.json({ error: "Không tạo được ảnh thu nhỏ" }, { status: 500 });
  }
}
