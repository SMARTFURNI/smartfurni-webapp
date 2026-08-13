/**
 * POST /api/crm/zalo-inbox/send-attachment
 * Gửi ảnh/video/file qua Zalo cá nhân
 * 
 * Body ưu tiên: raw binary (ổn định hơn multipart với video lớn trên Railway)
 * - x-zalo-conversation-id: string
 * - x-zalo-file-name: encodeURIComponent(file.name)
 * - content-type: MIME của file
 *
 * Multipart cũ vẫn được hỗ trợ để không làm hỏng client đang mở trước deploy.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import { sendZaloAttachment } from "@/lib/zalo-gateway";
import {
  formatZaloMediaLimit,
  getZaloMediaKind,
  getZaloMediaMaxBytes,
} from "@/lib/zalo-media-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!await canAccessZaloInbox(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "application/octet-stream";
    let conversationId = "";
    let fileName = "";
    let mimeType = contentType.split(";", 1)[0].trim() || "application/octet-stream";
    let fileBuffer: Buffer;
    let fileSize = 0;

    if (contentType.toLowerCase().startsWith("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      conversationId = String(formData.get("conversationId") || "").trim();
      if (!file) {
        return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
      }
      fileName = file.name;
      mimeType = file.type || "application/octet-stream";
      fileSize = file.size;
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      conversationId = (req.headers.get("x-zalo-conversation-id") || "").trim();
      const encodedFileName = req.headers.get("x-zalo-file-name") || "";
      try {
        fileName = decodeURIComponent(encodedFileName).trim();
      } catch {
        return NextResponse.json({ error: "Tên file không hợp lệ" }, { status: 400 });
      }
      fileBuffer = Buffer.from(await req.arrayBuffer());
      fileSize = fileBuffer.byteLength;
    }

    if (!conversationId || !fileName || fileSize <= 0) {
      return NextResponse.json(
        { error: "Thiếu conversationId hoặc file" },
        { status: 400 }
      );
    }

    const mediaKind = getZaloMediaKind(mimeType, fileName);
    if (fileSize > getZaloMediaMaxBytes(mediaKind)) {
      return NextResponse.json(
        { error: `File quá lớn. ${mediaKind === "image" ? "Ảnh" : mediaKind === "video" ? "Video" : "File"} tối đa ${formatZaloMediaLimit(mediaKind)}.` },
        { status: 400 }
      );
    }

    const result = await sendZaloAttachment({
      conversationId,
      fileBuffer,
      fileName,
      mimeType,
      fileSize,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Lỗi gửi file" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: result.message,
    });
  } catch (err: any) {
    console.error("[zalo-inbox/send-attachment] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Lỗi server" },
      { status: 500 }
    );
  }
}
