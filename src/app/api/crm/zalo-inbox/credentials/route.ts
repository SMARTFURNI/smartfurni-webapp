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

export async function GET() {
  const session = await getCrmSession() as any;
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Chỉ Admin mới có thể xem thông tin này" }, { status: 403 });
  }

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
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession() as any;
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Chỉ Admin mới có thể cấu hình Pancake" }, { status: 403 });
  }

  const body = await req.json();
  const { pageId, pageName, pageAccessToken, userApiToken, platform } = body;

  if (!pageId || !pageAccessToken) {
    return NextResponse.json(
      { error: "Thiếu thông tin: pageId và pageAccessToken là bắt buộc" },
      { status: 400 }
    );
  }

  await ensureTable();
  const db = getDb();

  // Deactivate all existing credentials
  await db.query(`UPDATE pancake_credentials SET is_active = FALSE`);

  // Insert new credentials
  const result = await db.query(
    `INSERT INTO pancake_credentials (page_id, page_name, page_access_token, user_api_token, platform, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING id, page_id, page_name, platform`,
    [pageId, pageName || 'Zalo Personal', pageAccessToken, userApiToken || null, platform || 'zalo']
  );

  return NextResponse.json({
    success: true,
    ...result.rows[0],
    message: "Đã lưu thông tin kết nối Pancake thành công!",
  });
}

export async function DELETE() {
  const session = await getCrmSession() as any;
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Chỉ Admin" }, { status: 403 });
  }

  await ensureTable();
  const db = getDb();
  await db.query(`UPDATE pancake_credentials SET is_active = FALSE`);

  return NextResponse.json({ success: true, message: "Đã xóa thông tin kết nối" });
}
