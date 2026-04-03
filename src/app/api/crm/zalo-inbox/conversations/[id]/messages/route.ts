/**
 * GET /api/crm/zalo-inbox/conversations/[id]/messages
 * Lấy tin nhắn của conversation từ DB (lưu qua zca-js listener)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getMessages } from "@/lib/zalo-inbox-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCrmSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversationId = (await params).id;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const messages = await getMessages(conversationId, limit, offset);
    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error("[messages] Error:", err);
    return NextResponse.json({ error: err.message, messages: [] }, { status: 500 });
  }
}
