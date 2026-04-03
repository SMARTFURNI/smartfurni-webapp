/**
 * POST /api/crm/zalo-inbox/conversations/[id]/read
 * Đánh dấu conversation đã đọc
 *
 * Bug fix 1: Next.js 15 — params là Promise, phải await trước khi dùng
 * Bug fix 2: Dùng nhầm Pancake API — phải dùng zalo-inbox-store (đúng service)
 *
 * ❌ Cũ: import { markConversationAsRead } from "@/lib/pancake-service"
 *         → Kiểm tra Pancake credentials → không có → luôn trả về lỗi 400
 *
 * ✅ Đã fix: import { markMessagesAsRead, markConversationAsRead } from "@/lib/zalo-inbox-store"
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import {
  markMessagesAsRead,
  markConversationAsRead,
} from "@/lib/zalo-inbox-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCrmSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Fix Bug 1: await params trước khi dùng (Next.js 15)
  const { id: conversationId } = await params;

  try {
    // ✅ Fix Bug 2: Dùng zalo-inbox-store thay vì pancake-service
    await markMessagesAsRead(conversationId);
    await markConversationAsRead(conversationId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[read] Error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi đánh dấu đã đọc" },
      { status: 500 }
    );
  }
}
