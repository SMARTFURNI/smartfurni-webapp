/**
 * GET /api/crm/zalo-inbox/conversations/[id]/messages
 * Lấy tin nhắn của conversation từ DB (lưu qua zca-js listener)
 *
 * Fix: Đọc từ đúng bảng zalo_inbox_messages (gateway lưu vào đây)
 * thay vì zalo_messages (bảng của zalo-inbox-store, không được gateway dùng)
 *
 * Bug fix: Next.js 15 — params là Promise, phải await trước khi dùng
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";

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
    // ✅ Fix Bug 2: Đọc từ zalo_inbox_messages (bảng gateway thực sự lưu)
    // Schema: msg_id, thread_id, from_id, to_id, content, attachments, msg_type, is_self, timestamp
    const rows = await query<{
      msg_id: string;
      thread_id: string;
      from_id: string;
      to_id: string;
      content: string;
      attachments: string;
      msg_type: string;
      is_self: boolean;
      timestamp: string;
      created_at: string;
    }>(
      `SELECT msg_id, thread_id, from_id, to_id, content, attachments, msg_type, is_self, timestamp, created_at
       FROM zalo_inbox_messages
       WHERE thread_id = $1
       ORDER BY timestamp ASC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );

    const messages = rows.map((row) => ({
      id: row.msg_id,
      conversationId: row.thread_id,
      senderId: row.from_id,
      senderName: row.from_id || "Khách",
      content: row.content || "",
      contentType: row.msg_type || "text",
      isSelf: row.is_self,
      isRead: true,
      createdAt: row.created_at || new Date(parseInt(row.timestamp) || Date.now()).toISOString(),
      attachments: (() => {
        try {
          return JSON.parse(row.attachments || "[]");
        } catch {
          return [];
        }
      })(),
    }));

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
