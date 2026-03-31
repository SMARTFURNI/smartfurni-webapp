/**
 * DELETE /api/crm/cleanup-leads
 * POST /api/crm/cleanup-leads
 * Xóa leads cũ từ Facebook để sync lại với dữ liệu mới (Admin only)
 * 
 * Cách sử dụng:
 * 1. Gọi DELETE /api/crm/cleanup-leads để xóa dữ liệu cũ
 * 2. Vào CRM Settings → Google Sheet Sync
 * 3. Nhấp "Sync tất cả" để import lại dữ liệu
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function DELETE(req: NextRequest) {
  try {
    console.log("[cleanup-leads] Starting cleanup of facebook leads...");
    
    // Xóa tất cả leads từ Facebook Sheet
    const result = await query<any>(
      "DELETE FROM crm_raw_leads WHERE source = $1",
      ["facebook_lead"]
    );

    console.log("[cleanup-leads] ✅ Successfully deleted all facebook leads");

    return NextResponse.json({
      success: true,
      message: "✅ Đã xóa tất cả leads từ Facebook. Hãy vào CRM Settings → Google Sheet Sync → Nhấp 'Sync tất cả' để import lại dữ liệu.",
      deletedCount: result.length || 0
    });
  } catch (error) {
    console.error("[cleanup-leads] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: String(error),
        message: "❌ Lỗi khi xóa dữ liệu"
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Alias cho DELETE
  return DELETE(req);
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Sử dụng DELETE method để xóa dữ liệu cũ",
    usage: "DELETE /api/crm/cleanup-leads",
    steps: [
      "1. Gọi DELETE /api/crm/cleanup-leads",
      "2. Vào CRM Settings → Google Sheet Sync",
      "3. Nhấp 'Sync tất cả' để import lại dữ liệu"
    ]
  });
}
