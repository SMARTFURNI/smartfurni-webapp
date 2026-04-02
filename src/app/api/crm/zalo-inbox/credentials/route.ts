/**
 * POST /api/crm/zalo-inbox/credentials — lưu Pancake API credentials
 * GET  /api/crm/zalo-inbox/credentials — lấy credentials hiện tại
 * DELETE /api/crm/zalo-inbox/credentials — xóa credentials
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

async function ensureTable() {
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS pancake_credentials (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      page_id TEXT NOT NULL,
      page_name TEXT,
      page_access_token TEXT NOT NULL,
      user_api_token TEXT,
      platform TEXT DEFAULT 'zalo',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const hasCrmCookie = cookieHeader.includes("sf_crm_staff_session") || cookieHeader.includes("sf_admin_session");
  console.log("[credentials GET] hasCrmCookie:", hasCrmCookie);

  const session = await getCrmSession();
  console.log("[credentials GET] session:", JSON.stringify(session));
  
  if (!session) {
    return NextResponse.json({ 
      error: "Unauthorized",
      debug_hasCookie: hasCrmCookie
    }, { status: 401 });
  }
  
  try {
    await ensureTable();
    const db = getDb();
    const result = await db.query(
      `SELECT id, page_id, page_name, platform, is_active, created_at,
              LEFT(page_access_token, 12) || '...' as token_preview
       FROM pancake_credentials WHERE is_active = TRUE LIMIT 1`
    );
    if (result.rows.length === 0) {
      return NextResponse.json(null);
    }
    return NextResponse.json({
      ...result.rows[0],
      hasCredentials: true,
    });
  } catch (err: any) {
    console.error("[credentials GET] DB error:", err.message);
    return NextResponse.json({ error: "DB error: " + err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const hasCrmCookie = cookieHeader.includes("sf_crm_staff_session") || cookieHeader.includes("sf_admin_session");
  console.log("[credentials POST] hasCrmCookie:", hasCrmCookie);

  const session = await getCrmSession();
  console.log("[credentials POST] session:", JSON.stringify(session));
  
  if (!session) {
    return NextResponse.json({ 
      error: "Unauthorized - Vui lòng đăng nhập lại CRM",
      debug_hasCookie: hasCrmCookie
    }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { pageId, pageName, pageAccessToken, userApiToken, platform } = body;
    
    console.log("[credentials POST] pageId:", pageId, "hasToken:", !!pageAccessToken);
    
    if (!pageId || !pageAccessToken) {
      return NextResponse.json(
        { error: "Thiếu thông tin: pageId và pageAccessToken là bắt buộc" },
        { status: 400 }
      );
    }
    
    await ensureTable();
    const db = getDb();
    await db.query(`UPDATE pancake_credentials SET is_active = FALSE`);
    
    const result = await db.query(
      `INSERT INTO pancake_credentials (page_id, page_name, page_access_token, user_api_token, platform, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, page_id, page_name, platform`,
      [pageId, pageName || 'Zalo Personal', pageAccessToken, userApiToken || null, platform || 'zalo']
    );
    
    console.log("[credentials POST] saved:", result.rows[0]);
    
    return NextResponse.json({
      success: true,
      ...result.rows[0],
      message: "Đã lưu thông tin kết nối Pancake thành công!",
    });
  } catch (err: any) {
    console.error("[credentials POST] error:", err.message);
    return NextResponse.json({ error: "Lỗi server: " + err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureTable();
    const db = getDb();
    await db.query(`UPDATE pancake_credentials SET is_active = FALSE`);
    return NextResponse.json({ success: true, message: "Đã xóa thông tin kết nối" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
