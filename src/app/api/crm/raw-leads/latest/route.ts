/**
 * GET /api/crm/raw-leads/latest?since=<ISO_TIMESTAMP>
 *
 * Trả về danh sách lead mới hơn `since`.
 * Client poll mỗi 5 giây để phát hiện lead mới và hiển thị toast notification.
 * Đây là giải pháp thay thế SSE vì Railway serverless không hỗ trợ long-running streams.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { initRawLeadSchema } from "@/lib/crm-raw-lead-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Xác thực session
  const session = await getCrmSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since");

  if (!since) {
    return NextResponse.json({ error: "Missing 'since' param" }, { status: 400 });
  }

  try {
    await initRawLeadSchema();

    // query() trả về T[] trực tiếp (không phải {rows: T[]})
    const rows = await query<{
      id: string;
      full_name: string;
      phone: string;
      source: string;
      created_at: string;
      campaign_name: string | null;
      ad_name: string | null;
    }>(
      `SELECT id, full_name, phone, source, created_at, campaign_name, ad_name
       FROM crm_raw_leads
       WHERE created_at > $1
       ORDER BY created_at ASC
       LIMIT 10`,
      [since]
    );

    const leads = (rows || []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      source: row.source,
      createdAt: new Date(row.created_at).toISOString(),
      campaignName: row.campaign_name ?? null,
      adName: row.ad_name ?? null,
    }));

    return NextResponse.json({ leads });
  } catch (err) {
    console.error("[raw-leads/latest] Error:", err);
    return NextResponse.json({ leads: [] });
  }
}
