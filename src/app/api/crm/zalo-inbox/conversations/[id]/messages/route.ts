/**
 * GET /api/crm/zalo-inbox/conversations/[id]/messages
 * Lấy tin nhắn của conversation từ DB (lưu qua zca-js listener)
 *
 * Bug fix: Next.js 15 — params là Promise, phải await trước khi dùng
 * ❌ Cũ (Next.js 14): { params }: { params: { id: string } }
 * ✅ Mới (Next.js 15): { params }: { params: Promise<{ id: string }> }
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

  // ✅ Fix Bug 1: await params trước khi dùng (Next.js 15)
  const { id: conversationId } = await params;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const messages = await getMessages(conversationId, limit, offset);
    return NextResponse.json({ messages });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[messages] Error:", error);
    return NextResponse.json(
      { error: error.message, messages: [] },
      { status: 500 }
    );
  }
}
