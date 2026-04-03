/**
 * POST /api/crm/zalo-inbox/conversations/[id]/read
 * Đánh dấu tin nhắn trong conversation đã đọc (lưu trong DB)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { markMessagesAsRead, markConversationAsRead } from "@/lib/zalo-inbox-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCrmSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await params;

  try {
    await markMessagesAsRead(conversationId);
    await markConversationAsRead(conversationId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[zalo-inbox/read] Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi đánh dấu đã đọc" }, { status: 500 });
  }
}
