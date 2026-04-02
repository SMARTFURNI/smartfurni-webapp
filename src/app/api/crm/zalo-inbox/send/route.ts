/**
 * POST /api/crm/zalo-inbox/send
 * Gửi tin nhắn Zalo
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { hasInboxAccess } from "@/lib/zalo-inbox-store";
import { sendZaloMessage } from "@/lib/zalo-gateway";

async function checkAccess(session: { isAdmin: boolean; staffId?: string; fullName?: string } | null): Promise<boolean> {
  if (!session) return false;
  if (session.isAdmin) return true;
  if (session.staffId) return await hasInboxAccess(session.staffId);
  return false;
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession() as any;
  if (!await checkAccess(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  const body = await req.json();
  const { conversationId, content } = body;

  if (!conversationId || !content?.trim()) {
    return NextResponse.json({ error: "Thiếu conversationId hoặc content" }, { status: 400 });
  }

  const senderName = session?.fullName || session?.username || "Nhân viên";
  const senderId = session?.staffId || "admin";

  const result = await sendZaloMessage({
    conversationId,
    content: content.trim(),
    senderName,
    senderId,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, messageId: result.messageId });
}
