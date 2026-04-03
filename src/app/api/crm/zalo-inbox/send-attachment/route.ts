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
import { upsertConversation } from "@/lib/zalo-inbox-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    // Kiểm tra kích thước file (tối đa 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File quá lớn. Tối đa 50MB." },
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
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Lỗi gửi file" },
        { status: 400 }
      );
    }

    // Upsert conversation với last message là tên file
    const mimeType = file.type || "";
    const fileLabel = mimeType.startsWith("image/") ? "[Hình ảnh]"
      : mimeType.startsWith("video/") ? "[Video]"
      : `[File: ${file.name}]`;
    try {
      await upsertConversation({
        id: conversationId,
        phone: conversationId,
        displayName: conversationId,
        lastMessage: fileLabel,
      });
    } catch { /* ignore */ }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[zalo-inbox/send-attachment] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Lỗi server" },
      { status: 500 }
    );
  }
}
