/**
 * GET /api/crm/zalo-inbox/conversations
 * Lấy danh sách hội thoại từ Pancake API
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { getPancakeConversations } from "@/lib/pancake-service";

async function getActivePancakeCredentials() {
  const db = getDb();
  try {
    const result = await db.query(
      `SELECT page_id, page_name, page_access_token FROM pancake_credentials WHERE is_active = TRUE LIMIT 1`
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

async function checkAccess(session: any): Promise<boolean> {
  if (!session) return false;
  if (session.isAdmin) return true;
  if (session.staffId) {
    const db = getDb();
    try {
      const result = await db.query(
        `SELECT 1 FROM zalo_inbox_access WHERE staff_id = $1 LIMIT 1`,
        [session.staffId]
      );
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!await checkAccess(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  }

  const creds = await getActivePancakeCredentials();
  if (!creds) {
    return NextResponse.json({
      conversations: [],
      total: 0,
      connected: false,
      message: "Chưa cấu hình Pancake API. Vui lòng vào Cài đặt để nhập thông tin kết nối.",
    });
  }

  const { searchParams } = new URL(req.url);
  const lastConversationId = searchParams.get("last_conversation_id") || undefined;

  try {
    // Lấy conversations từ Pancake API (chỉ INBOX type)
    const conversations = await getPancakeConversations(
      creds.page_id,
      creds.page_access_token,
      {
        lastConversationId,
        type: ['INBOX'],
        unreadFirst: true,
      }
    );

    // Enrich với CRM lead info
    const db = getDb();
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        let lead = null;

        // Tìm lead theo số điện thoại của participant
        const phone = conv.participants?.[0]?.phone;
        if (phone) {
          try {
            const cleanPhone = phone.replace(/\D/g, '').replace(/^84/, '0');
            const res = await db.query(
              `SELECT id, name, phone, stage, type, assigned_to,
                      (SELECT json_agg(json_build_object(
                        'id', id, 'name', name, 'status', status, 'total_amount', total_amount
                      ) ORDER BY created_at DESC)
                       FROM crm_quotes WHERE lead_id = crm_leads.id LIMIT 3) as recent_quotes
               FROM crm_leads 
               WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $1
                  OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $2
               LIMIT 1`,
              [cleanPhone, phone.replace(/\D/g, '')]
            );
            lead = res.rows[0] || null;
          } catch { /* ignore */ }
        }

        return {
          id: conv.id,
          displayName: conv.participants?.[0]?.name || 'Khách hàng',
          phone: conv.participants?.[0]?.phone || '',
          lastMessage: conv.last_message?.text || '',
          lastMessageAt: conv.last_message?.created_at || conv.updated_at,
          unreadCount: conv.type === 'INBOX' && !conv.last_message ? 0 : 0,
          tags: conv.tags || [],
          type: conv.type,
          lead,
          pancakeConversationId: conv.id,
          pageId: creds.page_id,
        };
      })
    );

    return NextResponse.json({
      conversations: enriched,
      total: enriched.length,
      connected: true,
      pageName: creds.page_name,
    });
  } catch (error: any) {
    console.error('Pancake API error:', error);
    return NextResponse.json({
      conversations: [],
      total: 0,
      connected: false,
      error: error.message || 'Lỗi kết nối Pancake API',
    }, { status: 500 });
  }
}
