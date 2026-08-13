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
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import { query } from "@/lib/db";
import { getRecentCanonicalZaloMessages } from "@/lib/zalo-inbox-message-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCrmSession();
  if (!await canAccessZaloInbox(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });
  }

  // ✅ Fix Bug 1: await params trước khi dùng (Next.js 15)
  const { id: conversationId } = await params;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");
  const accountId = searchParams.get("accountId") || undefined;
  if (!accountId) return NextResponse.json({ error: "Thiếu accountId", messages: [] }, { status: 400 });

  try {
    // Lấy display_name của conversation để dùng làm fallback tên người gửi
    let conversationDisplayName = "";
    let conversationPhone = "";
    let linkedLeadId = "";
    try {
      const convRows = await query<{ display_name: string; phone: string | null; lead_id: string | null }>(
        `SELECT display_name, phone, lead_id FROM zalo_conversations_v2
         WHERE thread_id = $1 AND account_id = $2 LIMIT 1`,
        [conversationId, accountId]
      );
      conversationDisplayName = convRows[0]?.display_name || "";
      conversationPhone = convRows[0]?.phone || "";
      linkedLeadId = convRows[0]?.lead_id || "";
    } catch { /* ignore nếu bảng chưa có */ }

    // Kiểm tra tên có phải ID số không
    const isNumericId = /^\d{8,}$/.test(conversationDisplayName);
    const fallbackName = (!isNumericId && conversationDisplayName) ? conversationDisplayName : "Khách";

    // Lấy tên từ CRM lead nếu display_name là ID số
    let leadName = "";
    if ((isNumericId || !conversationDisplayName) && (linkedLeadId || conversationPhone)) {
      try {
        const cleanPhone = conversationPhone.replace(/\D/g, "").replace(/^84/, "0");
        const leadRows = await query<{ name: string }>(
          `SELECT data->>'name' AS name FROM crm_leads
           WHERE id = $1
              OR ($2 <> '' AND REGEXP_REPLACE(COALESCE(data->>'phone', ''), '[^0-9]', '', 'g') = $2)
              OR ($3 <> '' AND REGEXP_REPLACE(COALESCE(data->>'phone', ''), '[^0-9]', '', 'g') = $3)
           LIMIT 1`,
          [linkedLeadId, cleanPhone, conversationPhone.replace(/\D/g, "")]
        );
        leadName = leadRows[0]?.name || "";
      } catch { /* ignore */ }
    }

    const resolvedSenderName = leadName || fallbackName;

    // Lấy tên thật của tài khoản Zalo (để hiển thị cho tin nhắn tự gửi)
    let selfDisplayName = "Tôi";
    try {
      const credRows = await query<{ display_name: string; user_id: string }>(
        `SELECT display_name, user_id FROM zalo_personal_accounts
         WHERE account_id = $1
         ORDER BY created_at ASC LIMIT 1`,
        [accountId],
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
    // Lấy trang gần hiện tại nhất rồi mới sắp xếp tăng dần để hiển thị.
    // Query cũ ORDER BY ASC + LIMIT lấy 100 tin đầu tiên, khiến mọi tin mới
    // trông như biến mất ngay sau khi tải lại trang.
    const rows = await getRecentCanonicalZaloMessages(conversationId, limit, offset, accountId);

    const messages = rows.map((row) => {
      // Ưu tiên: sender_name từ DB > tên từ conversation/lead > "Khách"
      const rawSenderName = row.sender_name || "";
      const isRawNumericId = /^\d{8,}$/.test(rawSenderName);
      const senderName = row.is_self
        ? selfDisplayName
        : ((!isRawNumericId && rawSenderName) ? rawSenderName : resolvedSenderName);

      return {
        id: row.msg_id,
        accountId: row.account_id,
        conversationId: row.thread_id,
        senderId: row.from_id,
        senderName,
        content: row.content || "",
        contentType: row.msg_type || "text",
        isSelf: row.is_self,
        isRead: true,
        createdAt: new Date(Number(row.timestamp) || Date.now()).toISOString(),
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
