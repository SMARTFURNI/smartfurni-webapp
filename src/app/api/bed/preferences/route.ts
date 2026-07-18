import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { ensureSmartBedAccountTables, getSmartBedSession } from "@/lib/smart-bed-auth";

const MAX_SETTINGS_BYTES = 96 * 1024;

export async function GET() {
  const user = await getSmartBedSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  await ensureSmartBedAccountTables();
  const row = await queryOne<{ settings: Record<string, unknown>; updatedAt: string }>(
    `SELECT settings, updated_at::text AS "updatedAt" FROM smart_bed_preferences WHERE user_id = $1`,
    [user.id],
  );
  return NextResponse.json({ settings: row?.settings || {}, updatedAt: row?.updatedAt || null });
}

export async function PUT(request: NextRequest) {
  const user = await getSmartBedSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const body = await request.json().catch(() => null) as { settings?: unknown } | null;
  if (!body?.settings || typeof body.settings !== "object" || Array.isArray(body.settings)) {
    return NextResponse.json({ error: "Cấu hình không hợp lệ" }, { status: 400 });
  }
  const serialized = JSON.stringify(body.settings);
  if (Buffer.byteLength(serialized, "utf8") > MAX_SETTINGS_BYTES) {
    return NextResponse.json({ error: "Cấu hình vượt quá giới hạn" }, { status: 413 });
  }
  await ensureSmartBedAccountTables();
  await queryOne(
    `INSERT INTO smart_bed_preferences (user_id, settings, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()
     RETURNING user_id`,
    [user.id, serialized],
  );
  return NextResponse.json({ success: true, updatedAt: new Date().toISOString() });
}
