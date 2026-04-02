/**
 * POST /api/crm/zalo-inbox/conversations/[id]/read
 * Đánh dấu hội thoại đã đọc
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { hasInboxAccess, markConversationAsRead, markMessagesAsRead } from "@/lib/zalo-inbox-store";

async function checkAccess(session: { isAdmin: boolean; staffId?: string } | null): Promise<boolean> {
  if (!session) return false;
  if (session.isAdmin) return true;
  if (session.staffId) return await hasInboxAccess(session.staffId);
  return false;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCrmSession();
  if (!await checkAccess(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  const { id } = await params;
  await markConversationAsRead(id);
  await markMessagesAsRead(id);
  return NextResponse.json({ success: true });
}
