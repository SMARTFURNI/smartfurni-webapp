/**
 * GET  /api/crm/me/theme  — Lấy darkMode preference của tài khoản đang đăng nhập
 * PATCH /api/crm/me/theme — Lưu darkMode preference vào DB theo tài khoản
 *
 * Lưu vào cột data JSONB của crm_staff: { ...existingData, preferences: { darkMode: boolean } }
 * Admin (không phải crm_staff) lưu qua cookie riêng.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById, updateStaff } from "@/lib/crm-staff-store";
import { query, queryOne } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// ─── GET: Lấy darkMode preference ────────────────────────────────────────────
export async function GET() {
  try {
    const session = await requireCrmAccess();

    if (session.isAdmin) {
      // Admin: đọc từ cookie sf_admin_theme
      const cookieStore = await cookies();
      const themeCookie = cookieStore.get("sf_admin_theme");
      const darkMode = themeCookie?.value === "dark";
      return NextResponse.json({ darkMode });
    }

    if (!session.staffId) {
      return NextResponse.json({ darkMode: false });
    }

    // Nhân viên: đọc từ data JSONB của crm_staff
    const row = await queryOne<{ data: string }>(
      "SELECT data FROM crm_staff WHERE id = $1",
      [session.staffId]
    );
    if (!row) return NextResponse.json({ darkMode: false });

    let data: Record<string, unknown>;
    try {
      data = typeof row.data === "string" ? JSON.parse(row.data) : (row.data as Record<string, unknown>);
    } catch {
      data = {};
    }
    const prefs = (data.preferences as Record<string, unknown>) ?? {};
    const darkMode = prefs.darkMode === true;
    return NextResponse.json({ darkMode });
  } catch {
    return NextResponse.json({ darkMode: false });
  }
}

// ─── PATCH: Lưu darkMode preference ──────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireCrmAccess();
    const body = await req.json();
    const darkMode = Boolean(body.darkMode);

    if (session.isAdmin) {
      // Admin: lưu vào cookie sf_admin_theme (1 năm)
      const res = NextResponse.json({ success: true });
      res.cookies.set("sf_admin_theme", darkMode ? "dark" : "light", {
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
      });
      return res;
    }

    if (!session.staffId) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 400 });
    }

    // Nhân viên: cập nhật data.preferences.darkMode trong crm_staff
    const row = await queryOne<{ data: string }>(
      "SELECT data FROM crm_staff WHERE id = $1",
      [session.staffId]
    );
    if (!row) {
      return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    let data: Record<string, unknown>;
    try {
      data = typeof row.data === "string" ? JSON.parse(row.data) : (row.data as Record<string, unknown>);
    } catch {
      data = {};
    }

    const updatedData = {
      ...data,
      preferences: {
        ...((data.preferences as Record<string, unknown>) ?? {}),
        darkMode,
      },
    };

    await query(
      "UPDATE crm_staff SET data = $1, updated_at = NOW() WHERE id = $2",
      [JSON.stringify(updatedData), session.staffId]
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[/api/crm/me/theme] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
