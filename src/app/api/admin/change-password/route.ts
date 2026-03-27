import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";

// Ensure admin_profile table exists
async function ensureAdminProfileTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_profile (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function GET() {
  await requireAdmin();
  await ensureAdminProfileTable();
  const rows = await query<{ key: string; value: string }>(
    "SELECT key, value FROM admin_profile WHERE key IN ('display_name', 'username')"
  );
  const profile: Record<string, string> = {};
  for (const row of rows) {
    profile[row.key] = row.value;
  }
  return NextResponse.json({
    displayName: profile["display_name"] || process.env.ADMIN_DISPLAY_NAME || "Admin",
    username: profile["username"] || process.env.ADMIN_USERNAME || "admin",
  });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  await ensureAdminProfileTable();

  const body = await req.json();
  const { action } = body;

  if (action === "change_password") {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Mật khẩu mới phải có ít nhất 8 ký tự" }, { status: 400 });
    }

    // Verify current password
    const { verifyCredentials } = await import("@/lib/admin-auth");
    // Get stored username
    const usernameRow = await query<{ value: string }>(
      "SELECT value FROM admin_profile WHERE key = 'username'"
    );
    const username = usernameRow[0]?.value || process.env.ADMIN_USERNAME || "admin";

    // Get stored password (from DB or env)
    const passwordRow = await query<{ value: string }>(
      "SELECT value FROM admin_profile WHERE key = 'password'"
    );
    const storedPassword = passwordRow[0]?.value || process.env.ADMIN_PASSWORD || "smartfurni2026";

    if (currentPassword !== storedPassword) {
      return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 401 });
    }

    // Save new password to DB
    await query(
      `INSERT INTO admin_profile (key, value, updated_at) VALUES ('password', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [newPassword]
    );

    return NextResponse.json({ success: true, message: "Đã cập nhật mật khẩu thành công" });
  }

  if (action === "update_profile") {
    const { displayName } = body;
    if (!displayName?.trim()) {
      return NextResponse.json({ error: "Tên hiển thị không được để trống" }, { status: 400 });
    }

    await query(
      `INSERT INTO admin_profile (key, value, updated_at) VALUES ('display_name', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [displayName.trim()]
    );

    return NextResponse.json({ success: true, message: "Đã cập nhật thông tin thành công" });
  }

  return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 });
}
