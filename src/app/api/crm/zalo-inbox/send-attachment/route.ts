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
import { sendZaloAttachment } from "@/lib/zalo-gateway";

export async function POST(req: NextRequest) {
  const session = await getCrmSession() as any;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Kiểm tra kích thước file (tối đa 25MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File quá lớn. Tối đa 25MB." },
        { status: 400 }
      );
    }

    // Đọc file thành Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const senderName = session.name || session.staffName || "Nhân viên";
    const senderId = session.id || session.staffId || "staff";

    const result = await sendZaloAttachment({
      conversationId,
      fileBuffer,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      senderName,
      senderId,
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
    });
  } catch (err: any) {
    console.error("[zalo-inbox/send-attachment] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Lỗi server" },
      { status: 500 }
    );
  }
}
