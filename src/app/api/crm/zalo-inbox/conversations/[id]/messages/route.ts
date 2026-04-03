/**
 * GET /api/crm/zalo-inbox/conversations/[id]/messages
 * Lấy tin nhắn của conversation từ DB (lưu qua Pancake Webhook)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCrmSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversationId = params.id;
  const db = getDb();

  try {
    // Đảm bảo bảng tồn tại
    await db.query(`
      CREATE TABLE IF NOT EXISTS pancake_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        page_id TEXT NOT NULL,
        sender_id TEXT,
        sender_name TEXT,
        content TEXT,
        is_self BOOLEAN DEFAULT FALSE,
        attachments JSONB,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const result = await db.query(
      `SELECT id, conversation_id, sender_id, sender_name, content, is_self, attachments, created_at
       FROM pancake_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT 200`,
      [conversationId]
    );

    const messages = result.rows.map((row: any) => ({
      id: row.id,
      conversationId: row.conversation_id,
      content: row.content || '',
      senderName: row.sender_name || 'Khách hàng',
      isSelf: row.is_self,
      createdAt: row.created_at,
      attachments: row.attachments || [],
    }));

    return NextResponse.json({
      messages,
      total: messages.length,
      source: 'db',
    });
  } catch (error: any) {
    console.error('[messages] DB error:', error);
    return NextResponse.json({
      messages: [],
      total: 0,
      error: error.message,
    });
  }
}
