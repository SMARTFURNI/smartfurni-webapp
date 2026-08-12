/**
 * POST /api/crm/zalo-inbox/send
 * Gửi tin nhắn Zalo cá nhân qua zca-js
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import { sendZaloMessage } from "@/lib/zalo-gateway";

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session || !await canAccessZaloInbox(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });
  }

  try {
    const body = await req.json();
    const { conversationId, content } = body;

    if (!conversationId || !content?.trim()) {
      return NextResponse.json(
        { error: "Thiếu conversationId hoặc nội dung tin nhắn" },
        { status: 400 }
      );
    }

    const senderName = session.isAdmin ? "Admin" : "Nhân viên";
    const senderId = session.staffId || "admin";

    const result = await sendZaloMessage({
      conversationId,
      content: content.trim(),
      senderName,
      senderId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Lỗi gửi tin nhắn" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error("[zalo-inbox/send] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Lỗi server" },
      { status: 500 }
    );
  }
}
