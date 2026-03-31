/**
 * GET /api/crm/check-leads
 * Kiểm tra dữ liệu leads hiện tại trong database
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Kiểm tra tổng số leads
    const totalResult = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM crm_raw_leads"
    );
    const total = parseInt(totalResult[0]?.count || "0", 10);

    // Kiểm tra leads theo source
    const bySourceResult = await query<{ source: string; count: string }>(
      "SELECT source, COUNT(*) as count FROM crm_raw_leads GROUP BY source"
    );

    // Kiểm tra leads có customerRole không
    const withRoleResult = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM crm_raw_leads WHERE customer_role IS NOT NULL AND customer_role != ''"
    );
    const withRole = parseInt(withRoleResult[0]?.count || "0", 10);

    // Lấy 5 leads đầu tiên để xem dữ liệu
    const sampleResult = await query<any>(
      "SELECT id, full_name, source, customer_role FROM crm_raw_leads LIMIT 5"
    );

    return NextResponse.json({
      total,
      bySource: bySourceResult.map(r => ({ source: r.source, count: parseInt(r.count, 10) })),
      withCustomerRole: withRole,
      samples: sampleResult
    });
  } catch (error) {
    console.error("[check-leads] Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
