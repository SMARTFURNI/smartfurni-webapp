/**
 * GET /api/crm/zalo-inbox/conversations/[id]/messages
 * Lấy tin nhắn của một hội thoại
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { hasInboxAccess, getMessages } from "@/lib/zalo-inbox-store";

async function checkAccess(session: { isAdmin: boolean; staffId?: string } | null): Promise<boolean> {
  if (!session) return false;
  if (session.isAdmin) return true;
  if (session.staffId) return await hasInboxAccess(session.staffId);
  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCrmSession();
  if (!await checkAccess(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");

  const messages = await getMessages(id, limit, offset);
  return NextResponse.json({ messages });
}
