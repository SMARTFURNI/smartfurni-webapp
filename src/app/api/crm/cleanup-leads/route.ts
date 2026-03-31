/**
 * DELETE /api/crm/cleanup-leads
 * Xóa leads cũ để sync lại với dữ liệu mới (Admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function DELETE(req: NextRequest) {
  try {
    // Xóa tất cả leads từ Facebook Sheet
    const result = await query<{ count: string }>(
      "DELETE FROM crm_raw_leads WHERE source = $1",
      ["facebook_lead"]
    );

    console.log("[cleanup-leads] Deleted facebook leads");

    return NextResponse.json({
      success: true,
      message: "Đã xóa tất cả leads từ Facebook Sheet",
      deletedCount: result.length,
    });
  } catch (error) {
    console.error("[cleanup-leads] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
