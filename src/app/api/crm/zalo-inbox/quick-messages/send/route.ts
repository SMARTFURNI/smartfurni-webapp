import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canSendZaloInboxMessages } from "@/lib/zalo-inbox-access";
import { getMediaObject } from "@/lib/media-storage";
import { incrementZaloMediaUsage } from "@/lib/zalo-media-library-store";
import { sendZaloAttachment, sendZaloMessage } from "@/lib/zalo-gateway";
import { getZaloQuickMessage, markZaloQuickMessageUsed } from "@/lib/zalo-quick-message-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function objectToBuffer(object: Awaited<ReturnType<typeof getMediaObject>>): Promise<Buffer> {
  if (!object.Body) throw new Error("Ảnh/video gốc không còn trong thư viện");
  return Buffer.from(await object.Body.transformToByteArray());
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!await canSendZaloInboxMessages(session)) {
    return NextResponse.json({ error: "Không có quyền gửi tin nhắn Zalo Inbox" }, { status: session ? 403 : 401 });
  }
  try {
    const body = await req.json() as { accountId?: string; conversationId?: string; templateId?: string };
    const accountId = body.accountId?.trim() || "";
    const conversationId = body.conversationId?.trim() || "";
    const templateId = body.templateId?.trim() || "";
    if (!accountId || !conversationId || !templateId) {
      return NextResponse.json({ error: "Thiếu hội thoại hoặc mẫu tin nhắn" }, { status: 400 });
    }
    const template = await getZaloQuickMessage(templateId);
    if (!template) return NextResponse.json({ error: "Mẫu tin nhắn không còn tồn tại" }, { status: 404 });

    const messages = [];
    const sentAssetIds: string[] = [];
    const failures: Array<{ id: string; name: string; error: string }> = [];
    if (template.content) {
      const textResult = await sendZaloMessage({
        accountId,
        conversationId,
        content: template.content,
        senderName: session?.isAdmin ? "Admin" : "Nhân viên",
        senderId: session?.staffId || "admin",
      });
      if (!textResult.success) {
        return NextResponse.json({ error: textResult.error || "Không gửi được nội dung mẫu" }, { status: 400 });
      }
      if (textResult.message) messages.push(textResult.message);
    }

    for (const asset of template.mediaAssets) {
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
          stableThumb: `/api/crm/zalo-inbox/media-library/thumbnail?id=${encodeURIComponent(asset.id)}`,
          skipMirror: true,
        });
        if (!result.success) throw new Error(result.error || "Zalo từ chối gửi media");
        if (result.message) messages.push(result.message);
        sentAssetIds.push(asset.id);
      } catch (error) {
        failures.push({ id: asset.id, name: asset.name, error: error instanceof Error ? error.message : "Gửi thất bại" });
      }
    }

    if (messages.length > 0) await markZaloQuickMessageUsed(template.id);
    await incrementZaloMediaUsage(sentAssetIds);
    return NextResponse.json({ success: failures.length === 0, messages, failures });
  } catch (error) {
    console.error("[zalo-quick-messages/send] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không gửi được tin nhắn nhanh" }, { status: 500 });
  }
}
