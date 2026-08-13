/**
 * POST /api/crm/zalo-inbox/send-attachment
 * Gửi ảnh/video/file qua Zalo cá nhân
 * 
 * Body: multipart/form-data
 * - conversationId: string
 * - file: File (ảnh, video, hoặc file khác)
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
    const formData = await req.formData();
    const conversationId = formData.get("conversationId") as string;
    const file = formData.get("file") as File | null;

    if (!conversationId || !file) {
      return NextResponse.json(
        { error: "Thiếu conversationId hoặc file" },
        { status: 400 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const mediaKind = getZaloMediaKind(mimeType);
    if (file.size > getZaloMediaMaxBytes(mediaKind)) {
      return NextResponse.json(
        { error: `File quá lớn. ${mediaKind === "image" ? "Ảnh" : mediaKind === "video" ? "Video" : "File"} tối đa ${formatZaloMediaLimit(mediaKind)}.` },
        { status: 400 }
      );
    }

    // Đọc file thành Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const result = await sendZaloAttachment({
      conversationId,
      fileBuffer,
      fileName: file.name,
      mimeType,
      fileSize: file.size,
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
