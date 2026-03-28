import { NextRequest, NextResponse } from "next/server";
import { getRawLeads, getRawLeadStats } from "@/lib/crm-raw-lead-store";
import { query } from "@/lib/db";

/**
 * Debug endpoint - không yêu cầu auth
 * Dùng để kiểm tra dữ liệu trong database
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Kiểm tra dữ liệu thô từ database
    const rawRows = await query<Record<string, unknown>>(
      "SELECT id, full_name, email, phone, status, source, created_at FROM crm_raw_leads ORDER BY created_at DESC LIMIT 10"
    );

    // 2. Kiểm tra getRawLeads()
    let rawLeadsResult = null;
    let rawLeadsError = null;
    try {
      rawLeadsResult = await getRawLeads();
    } catch (e) {
      rawLeadsError = e instanceof Error ? e.message : String(e);
    }

    // 3. Kiểm tra getRawLeadStats()
    let statsResult = null;
    let statsError = null;
    try {
      statsResult = await getRawLeadStats();
    } catch (e) {
      statsError = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({
      success: true,
      debug: {
        rawRowsFromDb: {
          count: rawRows.length,
          data: rawRows,
        },
        getRawLeads: {
          result: rawLeadsResult,
          error: rawLeadsError,
        },
        getRawLeadStats: {
          result: statsResult,
          error: statsError,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
