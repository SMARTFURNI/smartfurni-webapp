/**
 * GET /api/crm/zalo-inbox/conversations
 * Lấy danh sách hội thoại từ DB (zca-js đã lưu vào DB khi nhận tin nhắn)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getConversations, upsertConversation } from "@/lib/zalo-inbox-store";
import { getGatewayStatus, ensureZaloConnected, getZaloUserInfo } from "@/lib/zalo-gateway";
import { getDb } from "@/lib/db";

async function checkAccess(session: any): Promise<boolean> {
  if (!session) return false;
  if (session.isAdmin) return true;
  if (session.staffRole === 'manager' || session.staffRole === 'admin') return true;
  const db = getDb();
  try {
    const tableCheck = await db.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'zalo_inbox_access' LIMIT 1`
    );
    if (tableCheck.rows.length === 0) return true;
    const countRes = await db.query(`SELECT COUNT(*) as cnt FROM zalo_inbox_access`);
    const count = parseInt(countRes.rows[0]?.cnt || '0');
    if (count === 0) return true;
    const result = await db.query(
      `SELECT 1 FROM zalo_inbox_access WHERE staff_id = $1 LIMIT 1`,
      [session.staffId || session.id]
    );
    return result.rows.length > 0;
  } catch {
    return true;
  }
}

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!await checkAccess(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  }

  // Tự động kết nối lại Zalo nếu server vừa restart (Railway deploy)
  ensureZaloConnected().catch(() => {/* ignore */});

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const conversations = await getConversations(limit, offset);
    const gatewayStatus = getGatewayStatus();

    // Enrich với CRM lead info
    const db = getDb();
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        let lead = null;
        if (conv.phone) {
          try {
            const cleanPhone = conv.phone.replace(/\D/g, "").replace(/^84/, "0");
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
              [cleanPhone, conv.phone.replace(/\D/g, "")]
            );
            lead = res.rows[0] || null;
          } catch { /* ignore */ }
        }

        // Nếu displayName trông giống ID số Zalo (chỉ chứa số, dài > 8), ưu tiên dùng tên từ CRM lead
        const isNumericId = /^\d{8,}$/.test(conv.displayName?.trim() ?? "");
        const resolvedName = (isNumericId && lead?.name)
          ? lead.name
          : (conv.displayName && !isNumericId ? conv.displayName : (lead?.name || conv.phone));
        return {
          id: conv.id,
          displayName: resolvedName,
          phone: conv.phone,
          avatarUrl: conv.avatarUrl,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount,
          lead,
        };
      })
    );

    // Fire-and-forget: enrich avatar cho conversations chưa có avatar
    const missingAvatarConvs = enriched.filter(c => !c.avatarUrl && c.id);
    if (missingAvatarConvs.length > 0 && gatewayStatus.isConnected) {
      Promise.all(
        missingAvatarConvs.slice(0, 5).map(async (conv) => { // limit 5 per request
          try {
            const info = await getZaloUserInfo(conv.id);
            if (info.success && info.user) {
              // getZaloUserInfo đã parse đúng cấu trúc zalo-personal: { displayName, zaloName, avatar }
              const avatar = info.user?.avatar || null;
              const name = info.user?.displayName || info.user?.zaloName || null;
              if (avatar || name) {
                await upsertConversation({
                  id: conv.id,
                  phone: conv.id,
                  displayName: name || conv.displayName,
                  avatarUrl: avatar,
                  lastMessage: conv.lastMessage,
                });
                // Update in response
                if (avatar) conv.avatarUrl = avatar;
                if (name && /^\d{8,}$/.test(conv.displayName)) conv.displayName = name;
              }
            }
          } catch { /* ignore */ }
        })
      ).catch(() => {});
    }

    return NextResponse.json({
      conversations: enriched,
      total: enriched.length,
      connected: gatewayStatus.isConnected,
      status: gatewayStatus.status,
      // phone: hiển thị tên thật nếu có, fallback về userId
      phone: gatewayStatus.displayName || gatewayStatus.phone,
      displayName: gatewayStatus.displayName || null,
    });
  } catch (error: any) {
    console.error("[zalo-inbox/conversations] Error:", error);
    return NextResponse.json({
      conversations: [],
      total: 0,
      connected: false,
      error: error.message || "Lỗi server",
    }, { status: 500 });
  }
}
