import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import {
  deleteMediaObject,
  sanitizeMediaSegment,
  setMediaRetained,
  storeMediaObject,
} from "@/lib/media-storage";
import {
  archiveZaloMediaAsset,
  createZaloMediaAsset,
  getZaloMediaLibraryCounts,
  listZaloMediaAssets,
  listZaloMediaFolders,
  updateZaloMediaAsset,
} from "@/lib/zalo-media-library-store";
import {
  formatZaloMediaLimit,
  getZaloMediaKind,
  getZaloMediaMaxBytes,
  type ZaloMediaKind,
} from "@/lib/zalo-media-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function actorId(session: { isAdmin: boolean; staffId?: string } | null): string {
  return session?.staffId || (session?.isAdmin ? "admin" : "unknown");
}

function safeHeaderFileName(req: NextRequest): string {
  const raw = req.headers.get("x-media-file-name") || "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return "";
  }
}

async function authorized() {
  const session = await getCrmSession();
  return { session, allowed: await canAccessZaloInbox(session) };
}

export async function GET(req: NextRequest) {
  const { session, allowed } = await authorized();
  if (!allowed) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });

  try {
    const params = req.nextUrl.searchParams;
    const folder = params.get("folder");
    const kind = params.get("kind") || "all";
    const [folders, assets, counts] = await Promise.all([
      listZaloMediaFolders(),
      listZaloMediaAssets({
        folderId: folder && folder !== "all" && folder !== "unfiled" ? folder : undefined,
        unfiled: folder === "unfiled",
        kind: (["image", "video", "file"] as string[]).includes(kind) ? kind as ZaloMediaKind : "all",
        search: params.get("q") || "",
      }),
      getZaloMediaLibraryCounts(),
    ]);
    return NextResponse.json({ folders, assets, counts });
  } catch (error) {
    console.error("[zalo-media-library] GET error:", error);
    return NextResponse.json({ error: "Không tải được thư viện media" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, allowed } = await authorized();
  if (!allowed) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });

  let storedKey = "";
  try {
    const name = safeHeaderFileName(req);
    const contentType = (req.headers.get("content-type") || "application/octet-stream").split(";", 1)[0].trim();
    const folderId = (req.headers.get("x-media-folder-id") || "").trim() || null;
    const body = Buffer.from(await req.arrayBuffer());
    if (!name || !body.byteLength) return NextResponse.json({ error: "Thiếu file tải lên" }, { status: 400 });

    const mediaKind = getZaloMediaKind(contentType, name);
    if (body.byteLength > getZaloMediaMaxBytes(mediaKind)) {
      return NextResponse.json({ error: `File quá lớn. Giới hạn ${formatZaloMediaLimit(mediaKind)}.` }, { status: 400 });
    }

    let width: number | undefined;
    let height: number | undefined;
    if (mediaKind === "image") {
      try {
        const sharp = (await import("sharp")).default;
        const metadata = await sharp(body).metadata();
        width = metadata.width;
        height = metadata.height;
      } catch { /* Không chặn upload nếu ảnh không đọc được metadata. */ }
    }

    const assetId = crypto.randomUUID();
    storedKey = `zalo-media-library/${folderId ? sanitizeMediaSegment(folderId) : "unfiled"}/${assetId}-${sanitizeMediaSegment(name)}`;
    const actor = actorId(session);
    const stored = await storeMediaObject({
      body,
      key: storedKey,
      contentType,
      visibility: "private",
      cacheControl: "private, max-age=31536000, immutable",
      originalName: name,
      entityType: "zalo_media_library",
      entityId: assetId,
      createdBy: actor,
    });
    await setMediaRetained(stored.key, true, actor);
    const asset = await createZaloMediaAsset({
      id: assetId,
      folderId,
      name,
      objectKey: stored.key,
      contentType,
      mediaKind,
      sizeBytes: body.byteLength,
      width,
      height,
      actor,
    });
    return NextResponse.json({ success: true, asset }, { status: 201 });
  } catch (error) {
    if (storedKey) {
      await setMediaRetained(storedKey, false).catch(() => undefined);
      await deleteMediaObject(storedKey).catch(() => undefined);
    }
    console.error("[zalo-media-library] POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tải được file lên thư viện" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, allowed } = await authorized();
  if (!allowed) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });
  try {
    const body = await req.json() as { id?: string; name?: string; folderId?: string | null };
    if (!body.id) return NextResponse.json({ error: "Thiếu tài liệu" }, { status: 400 });
    await updateZaloMediaAsset({
      id: body.id,
      name: body.name,
      folderId: Object.prototype.hasOwnProperty.call(body, "folderId") ? (body.folderId || null) : undefined,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[zalo-media-library] PATCH error:", error);
    return NextResponse.json({ error: "Không cập nhật được tài liệu" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { session, allowed } = await authorized();
  if (!allowed) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });
  try {
    const id = req.nextUrl.searchParams.get("id") || "";
    if (!id) return NextResponse.json({ error: "Thiếu tài liệu" }, { status: 400 });
    const asset = await archiveZaloMediaAsset(id);
    if (!asset) return NextResponse.json({ error: "Không tìm thấy tài liệu" }, { status: 404 });
    // Tài liệu chưa từng dùng có thể xóa vật lý. Tài liệu đã gửi vẫn được giữ
    // để lịch sử hội thoại không xuất hiện liên kết hỏng.
    if (asset.usageCount === 0) {
      await setMediaRetained(asset.objectKey, false).catch(() => undefined);
      await deleteMediaObject(asset.objectKey).catch(() => undefined);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[zalo-media-library] DELETE error:", error);
    return NextResponse.json({ error: "Không xóa được tài liệu" }, { status: 500 });
  }
}
