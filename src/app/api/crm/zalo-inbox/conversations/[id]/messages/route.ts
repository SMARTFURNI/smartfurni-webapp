/**
 * GET /api/crm/zalo-inbox/conversations/[id]/messages
 * Lấy tin nhắn của conversation từ DB (lưu qua zca-js listener)
 *
 * Fix: Đọc từ đúng bảng zalo_inbox_messages (gateway lưu vào đây)
 * thay vì zalo_messages (bảng của zalo-inbox-store, không được gateway dùng)
 *
 * Bug fix: Next.js 15 — params là Promise, phải await trước khi dùng
 * Bug fix 2: Lấy sender_name từ DB, fallback về display_name từ zalo_conversations
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
    // Lấy display_name của conversation để dùng làm fallback tên người gửi
    let conversationDisplayName = "";
    try {
      const convRows = await query<{ display_name: string }>(
        `SELECT display_name FROM zalo_conversations WHERE id = $1 LIMIT 1`,
        [conversationId]
      );
      conversationDisplayName = convRows[0]?.display_name || "";
    } catch { /* ignore nếu bảng chưa có */ }

    // Kiểm tra tên có phải ID số không
    const isNumericId = /^\d{8,}$/.test(conversationDisplayName);
    const fallbackName = (!isNumericId && conversationDisplayName) ? conversationDisplayName : "Khách";

    // Lấy tên từ CRM lead nếu display_name là ID số
    let leadName = "";
    if (isNumericId || !conversationDisplayName) {
      try {
        const cleanPhone = conversationId.replace(/\D/g, "").replace(/^84/, "0");
        const leadRows = await query<{ name: string }>(
          `SELECT name FROM crm_leads 
           WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $1
              OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $2
           LIMIT 1`,
          [cleanPhone, conversationId.replace(/\D/g, "")]
        );
        leadName = leadRows[0]?.name || "";
      } catch { /* ignore */ }
    }

    const resolvedSenderName = leadName || fallbackName;

    // Lấy tên thật của tài khoản Zalo (để hiển thị cho tin nhắn tự gửi)
    let selfDisplayName = "Tôi";
    try {
      const credRows = await query<{ display_name: string; user_id: string }>(
        `SELECT display_name, user_id FROM zalo_inbox_credentials LIMIT 1`
      );
      const rawName = credRows[0]?.display_name || "";
      const rawId = credRows[0]?.user_id || "";
      // Chỉ dùng display_name nếu không phải ID số thuần
      const isNumericDisplayName = /^\d{8,}$/.test(rawName.trim());
      if (rawName && !isNumericDisplayName) selfDisplayName = rawName;
      else if (rawId && !/^\d{8,}$/.test(rawId.trim())) selfDisplayName = rawId;
      // else keep "Tôi" as fallback
    } catch { /* ignore */ }

    // ✅ Fix Bug 2: Đọc từ zalo_inbox_messages kèm sender_name
    const rows = await query<{
      msg_id: string;
      thread_id: string;
      from_id: string;
      to_id: string;
      sender_name: string | null;
      content: string;
      attachments: string;
      msg_type: string;
      is_self: boolean;
      timestamp: string;
      created_at: string;
    }>(
      `SELECT msg_id, thread_id, from_id, to_id, sender_name, content, attachments, msg_type, is_self, timestamp, created_at
       FROM zalo_inbox_messages
       WHERE thread_id = $1
       ORDER BY timestamp ASC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );

    const messages = rows.map((row) => {
      // Ưu tiên: sender_name từ DB > tên từ conversation/lead > "Khách"
      const rawSenderName = row.sender_name || "";
      const isRawNumericId = /^\d{8,}$/.test(rawSenderName);
      const senderName = row.is_self
        ? selfDisplayName
        : ((!isRawNumericId && rawSenderName) ? rawSenderName : resolvedSenderName);

      return {
        id: row.msg_id,
        conversationId: row.thread_id,
        senderId: row.from_id,
        senderName,
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
      };
    });

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
