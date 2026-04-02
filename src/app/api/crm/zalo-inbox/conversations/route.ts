/**
 * GET /api/crm/zalo-inbox/conversations
 * Lấy danh sách hội thoại Zalo
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { hasInboxAccess } from "@/lib/zalo-inbox-store";
import { getConversations } from "@/lib/zalo-inbox-store";
import { getGatewayStatus } from "@/lib/zalo-gateway";
import { query } from "@/lib/db";

async function checkAccess(session: { isAdmin: boolean; staffId?: string } | null): Promise<boolean> {
  if (!session) return false;
  if (session.isAdmin) return true;
  if (session.staffId) return await hasInboxAccess(session.staffId);
  return false;
}

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!await checkAccess(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const conversations = await getConversations(limit, offset);
  const gatewayStatus = getGatewayStatus();

  // Enrich với lead info
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      let lead = null;
      if (conv.leadId) {
        try {
          const res = await query(
            `SELECT id, name, phone, stage, type, assigned_to, 
                    (SELECT json_agg(json_build_object('id', id, 'name', name, 'status', status, 'total_amount', total_amount) ORDER BY created_at DESC)
                     FROM crm_quotes WHERE lead_id = crm_leads.id LIMIT 3) as recent_quotes
             FROM crm_leads WHERE id = $1`,
            [conv.leadId]
          );
          lead = res.rows[0] || null;
        } catch { /* ignore */ }
      }
      return { ...conv, lead };
    })
  );

  return NextResponse.json({
    conversations: enriched,
    total: enriched.length,
    gatewayStatus,
  });
}
