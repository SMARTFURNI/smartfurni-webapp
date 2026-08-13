import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import { getMediaObject } from "@/lib/media-storage";
import { getZaloMediaAssets, incrementZaloMediaUsage } from "@/lib/zalo-media-library-store";
import { sendZaloAttachment } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function objectToBuffer(object: Awaited<ReturnType<typeof getMediaObject>>): Promise<Buffer> {
  if (!object.Body) throw new Error("File gốc không còn trong thư viện");
  return Buffer.from(await object.Body.transformToByteArray());
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!await canAccessZaloInbox(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });
  }
  try {
    const body = await req.json() as { accountId?: string; conversationId?: string; assetIds?: string[] };
    const conversationId = body.conversationId?.trim() || "";
    const accountId = body.accountId?.trim() || "";
    const assetIds = [...new Set(body.assetIds || [])].slice(0, 10);
    if (!accountId || !conversationId || !assetIds.length) {
      return NextResponse.json({ error: "Thiếu hội thoại hoặc tài liệu" }, { status: 400 });
    }
    const assets = await getZaloMediaAssets(assetIds);
    if (!assets.length) return NextResponse.json({ error: "Không tìm thấy tài liệu" }, { status: 404 });

    const messages = [];
    const sentIds: string[] = [];
    const failures: Array<{ id: string; name: string; error: string }> = [];
    // Gửi tuần tự để giữ đúng thứ tự lựa chọn và không làm quá tải phiên Zalo.
    for (const asset of assets) {
      try {
        const object = await getMediaObject(asset.objectKey);
        const fileBuffer = await objectToBuffer(object);
        const result = await sendZaloAttachment({
          accountId,
          conversationId,
          fileBuffer,
          fileName: asset.name,
          mimeType: asset.contentType,
          fileSize: asset.sizeBytes || fileBuffer.byteLength,
          width: asset.width || undefined,
          height: asset.height || undefined,
          duration: asset.durationMs ? asset.durationMs / 1000 : undefined,
          stableUrl: asset.url,
          stableThumb: asset.mediaKind === "file" ? "" : asset.url,
          skipMirror: true,
        });
        if (!result.success) throw new Error(result.error || "Zalo từ chối gửi file");
        if (result.message) messages.push(result.message);
        sentIds.push(asset.id);
      } catch (error) {
        failures.push({ id: asset.id, name: asset.name, error: error instanceof Error ? error.message : "Gửi thất bại" });
      }
    }
    await incrementZaloMediaUsage(sentIds);
    return NextResponse.json({ success: failures.length === 0, messages, failures });
  } catch (error) {
    console.error("[zalo-media-library/send] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không gửi được tài liệu" }, { status: 500 });
  }
}
