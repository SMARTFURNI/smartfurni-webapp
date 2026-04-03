/**
 * GET /api/crm/zalo-inbox/conversations
 * Lấy danh sách hội thoại từ Pancake API
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { getPancakeConversations } from "@/lib/pancake-service";
import { getConversationsMock } from "@/lib/pancake-service-mock";

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
  // Staff manager/admin role tự động có quyền
  if (session.staffRole === 'manager' || session.staffRole === 'admin') return true;
  if (session.staffId) {
    const db = getDb();
    try {
      // Kiểm tra bảng access có tồn tại không
      const tableCheck = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_name = 'zalo_inbox_access' LIMIT 1`
      );
      if (tableCheck.rows.length === 0) {
        // Bảng chưa tồn tại, cho phép tất cả staff truy cập
        return true;
      }
      // Kiểm tra số lượng access records
      const countRes = await db.query(`SELECT COUNT(*) as cnt FROM zalo_inbox_access`);
      const count = parseInt(countRes.rows[0]?.cnt || '0');
      if (count === 0) {
        // Chưa có ai được cấp quyền, cho phép tất cả staff truy cập
        return true;
      }
      const result = await db.query(
        `SELECT 1 FROM zalo_inbox_access WHERE staff_id = $1 LIMIT 1`,
        [session.staffId]
      );
      return result.rows.length > 0;
    } catch {
      // Nếu có lỗi DB, cho phép truy cập để không block user
      return true;
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
  const useMock = !creds; // Dùng mock data nếu chưa có credentials

  if (useMock) {
    // Dùng mock data để test giao diện
    const mockConvs = await getConversationsMock();
    const db = getDb();
    const enriched = await Promise.all(
      mockConvs.map(async (conv) => {
        let lead = null;
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
          unreadCount: 0,
          tags: conv.tags || [],
          type: conv.type,
          lead,
          pancakeConversationId: conv.id,
          pageId: 'mock_page',
        };
      })
    );

    return NextResponse.json({
      conversations: enriched,
      total: enriched.length,
      connected: true,
      pageName: 'Mock Data (Test)',
      isMock: true,
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

        // Pancake API trả về tên trong from.name và số điện thoại trong from.phone_number
        const convAny = conv as any;
        const customerName = convAny.from?.name || convAny.customers?.[0]?.name || 'Khách hàng';
        const customerPhone = convAny.from?.phone_number || convAny.customers?.[0]?.phone || '';
        const customerAvatar = convAny.from?.avatar_url || convAny.customers?.[0]?.avatar_url || '';
        const lastMessageText = convAny.snippet || conv.last_message?.text || '';

        const phone = customerPhone;
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
          displayName: customerName,
          phone: customerPhone,
          avatar: customerAvatar,
          lastMessage: lastMessageText,
          lastMessageAt: conv.updated_at || conv.last_message?.created_at,
          unreadCount: convAny.seen === false ? 1 : 0,
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
