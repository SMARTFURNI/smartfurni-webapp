/**
 * GET /api/crm/zalo-inbox/conversations
 * Lấy danh sách hội thoại từ DB (zca-js đã lưu vào DB khi nhận tin nhắn)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getConversationCount, getConversations, linkConversationToLead, upsertConversation } from "@/lib/zalo-inbox-store";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import { getGatewayStatus, ensureZaloConnected, getZaloUserProfiles } from "@/lib/zalo-gateway";
import { getDb } from "@/lib/db";

const avatarEnrichmentAttempts = new Map<string, number>();
const AVATAR_RETRY_MS = 6 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!await canAccessZaloInbox(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  }

  // Tự động kết nối lại Zalo nếu server vừa restart (Railway deploy)
  ensureZaloConnected().catch(() => {/* ignore */});

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const [conversations, total] = await Promise.all([
      getConversations(limit, offset),
      getConversationCount(),
    ]);
    const gatewayStatus = getGatewayStatus();

    // Đối soát CRM theo một truy vấn thay vì N+1 truy vấn cho từng hội thoại.
    const db = getDb();
    const normalizedPhones = Array.from(new Set(conversations.flatMap((conv) => {
      if (!conv.phone) return [];
      const raw = conv.phone.replace(/\D/g, "");
      return [raw, raw.replace(/^84/, "0")].filter(Boolean);
    })));
    const linkedLeadIds = Array.from(new Set(conversations.flatMap((conv) => conv.leadId ? [conv.leadId] : [])));
    const leadsByPhone = new Map<string, any>();
    const leadsById = new Map<string, any>();
    if (normalizedPhones.length > 0 || linkedLeadIds.length > 0) {
      try {
        const leadResult = await db.query(
          `SELECT l.id,
                  l.data->>'name' AS name,
                  l.data->>'phone' AS phone,
                  l.data->>'stage' AS stage,
                  l.data->>'type' AS type,
                  l.data->>'assignedTo' AS assigned_to,
                  COALESCE((
                    SELECT json_agg(q ORDER BY q.created_at DESC)
                    FROM (
                      SELECT id,
                             data->>'quoteNumber' AS name,
                             data->>'status' AS status,
                             COALESCE(NULLIF(data->>'total', '')::numeric, 0) AS total_amount,
                             data->>'createdAt' AS created_at
                      FROM crm_quotes
                      WHERE lead_id = l.id
                      ORDER BY updated_at DESC
                      LIMIT 3
                    ) q
                  ), '[]'::json) AS recent_quotes
           FROM crm_leads l
           WHERE l.id = ANY($1::text[])
              OR REGEXP_REPLACE(COALESCE(l.data->>'phone', ''), '[^0-9]', '', 'g') = ANY($2::text[])`,
          [linkedLeadIds, normalizedPhones]
        );
        for (const lead of leadResult.rows) {
          leadsById.set(lead.id, lead);
          const raw = String(lead.phone || "").replace(/\D/g, "");
          if (raw) {
            leadsByPhone.set(raw, lead);
            leadsByPhone.set(raw.replace(/^84/, "0"), lead);
          }
        }
      } catch (error) {
        console.error("[zalo-inbox/conversations] CRM enrichment failed", error);
      }
    }

    const enriched = conversations.map((conv) => {
        const rawPhone = String(conv.phone || "").replace(/\D/g, "");
        const lead = (conv.leadId ? leadsById.get(conv.leadId) : null)
          || (rawPhone ? leadsByPhone.get(rawPhone) || leadsByPhone.get(rawPhone.replace(/^84/, "0")) : null)
          || null;

        // Nếu displayName trông giống ID số Zalo (chỉ chứa số, dài > 8), ưu tiên dùng tên từ CRM lead
        const isNumericId = /^\d{8,}$/.test(conv.displayName?.trim() ?? "");
        const resolvedName = (isNumericId && lead?.name)
          ? lead.name
          : (conv.displayName && !isNumericId ? conv.displayName : (lead?.name || conv.phone || conv.zaloUserId || "Khách Zalo"));
        const normalizedLead = lead ? {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          stage: lead.stage,
          type: lead.type,
          assignedTo: lead.assigned_to,
          recent_quotes: lead.recent_quotes || [],
        } : null;
        return {
          id: conv.id,
          leadId: lead?.id || conv.leadId,
          zaloUserId: conv.zaloUserId,
          displayName: resolvedName,
          phone: conv.phone,
          avatarUrl: conv.avatarUrl,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount,
          lead: normalizedLead,
        };
      });

    // Đồng bộ theo lô thay vì chỉ thử 5 hồ sơ đầu tiên. Cách cũ bị kẹt vĩnh
    // viễn nếu 5 tài khoản đầu không đặt avatar, khiến các liên hệ sau không
    // bao giờ được hỏi Zalo. Kết quả được trả ngay trong response hiện tại.
    const now = Date.now();
    const missingAvatarConvs = enriched.filter(c =>
      !c.avatarUrl
      && c.id
      && now - (avatarEnrichmentAttempts.get(c.id) || 0) >= AVATAR_RETRY_MS,
    );
    if (missingAvatarConvs.length > 0 && gatewayStatus.isConnected) {
      const batch = missingAvatarConvs.slice(0, 50);
      batch.forEach(conv => avatarEnrichmentAttempts.set(conv.id, now));
      const result = await getZaloUserProfiles(batch.map(conv => conv.id));
      if (result.success && result.users) {
        await Promise.all(batch.map(async (conv) => {
          const info = result.users?.get(conv.id);
          if (!info) return;
          const avatar = info.avatar || null;
          const name = info.displayName || info.zaloName || null;
          if (!avatar && !name) return;
          await upsertConversation({
            id: conv.id,
            zaloUserId: conv.zaloUserId || conv.id,
            displayName: name || conv.displayName,
            avatarUrl: avatar,
            lastMessage: conv.lastMessage,
            lastMessageAt: conv.lastMessageAt,
          });
          if (avatar) conv.avatarUrl = avatar;
          if (name && /^\d{8,}$/.test(conv.displayName)) conv.displayName = name;
        }));
      } else {
        // Cho phép thử lại sớm nếu cả request đồng bộ thất bại.
        batch.forEach(conv => avatarEnrichmentAttempts.delete(conv.id));
      }
    }

    return NextResponse.json({
      conversations: enriched,
      total,
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

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!await canAccessZaloInbox(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });
  }
  try {
    const { conversationId, leadId } = await req.json();
    if (!conversationId) return NextResponse.json({ error: "Thiếu conversationId" }, { status: 400 });
    if (!leadId) {
      await linkConversationToLead(conversationId, null);
      return NextResponse.json({ success: true });
    }
    const db = getDb();
    const leadResult = await db.query(
      `SELECT id, data->>'phone' AS phone FROM crm_leads WHERE id = $1 LIMIT 1`,
      [leadId]
    );
    if (!leadResult.rows[0]) return NextResponse.json({ error: "Không tìm thấy khách hàng" }, { status: 404 });
    await linkConversationToLead(conversationId, leadId, leadResult.rows[0].phone || null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[zalo-inbox/conversations] Link lead failed", error);
    return NextResponse.json({ error: "Không thể liên kết hồ sơ khách hàng" }, { status: 500 });
  }
}
