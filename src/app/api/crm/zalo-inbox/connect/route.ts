/**
 * GET /api/crm/zalo-inbox/connect — lấy trạng thái kết nối Pancake
 */
import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

async function getActivePancakeCredentials() {
  const db = getDb();
  try {
    const result = await db.query(
      `SELECT page_id, page_name, is_active FROM pancake_credentials WHERE is_active = TRUE LIMIT 1`
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creds = await getActivePancakeCredentials();
  
  return NextResponse.json({
    connected: !!creds,
    pageName: creds?.page_name || null,
    pageId: creds?.page_id || null,
    message: creds 
      ? "Đã kết nối với Pancake" 
      : "Chưa cấu hình Pancake API. Vui lòng vào Cài đặt để nhập thông tin.",
  });
}
