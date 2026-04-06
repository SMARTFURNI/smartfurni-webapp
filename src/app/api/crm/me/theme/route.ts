/**
 * GET  /api/crm/me/theme  — Lấy theme preferences (darkMode + gradientPreset)
 * PATCH /api/crm/me/theme — Lưu theme preferences vào DB/cookie theo tài khoản
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { query, queryOne } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// ─── GET: Lấy theme preferences ──────────────────────────────────────────────
export async function GET() {
  try {
    const session = await requireCrmAccess();

    if (session.isAdmin) {
      const cookieStore = await cookies();
      const darkMode = cookieStore.get("sf_admin_theme")?.value === "dark";
      const gradientPreset = cookieStore.get("sf_admin_gradient")?.value ?? "default";
      return NextResponse.json({ darkMode, gradientPreset });
    }

    if (!session.staffId) {
      return NextResponse.json({ darkMode: false, gradientPreset: "default" });
    }

    const row = await queryOne<{ data: string }>(
      "SELECT data FROM crm_staff WHERE id = $1",
      [session.staffId]
    );
    if (!row) return NextResponse.json({ darkMode: false, gradientPreset: "default" });

    let data: Record<string, unknown>;
    try {
      data = typeof row.data === "string" ? JSON.parse(row.data) : (row.data as Record<string, unknown>);
    } catch {
      data = {};
    }
    const prefs = (data.preferences as Record<string, unknown>) ?? {};
    return NextResponse.json({
      darkMode: prefs.darkMode === true,
      gradientPreset: (prefs.gradientPreset as string) ?? "default",
    });
  } catch {
    return NextResponse.json({ darkMode: false, gradientPreset: "default" });
  }
}

// ─── PATCH: Lưu theme preferences ────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireCrmAccess();
    const body = await req.json();
    const darkMode = body.darkMode !== undefined ? Boolean(body.darkMode) : undefined;
    const gradientPreset = typeof body.gradientPreset === "string" ? body.gradientPreset : undefined;

    if (session.isAdmin) {
      const res = NextResponse.json({ success: true });
      if (darkMode !== undefined) {
        res.cookies.set("sf_admin_theme", darkMode ? "dark" : "light", {
          httpOnly: false, maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax",
        });
      }
      if (gradientPreset !== undefined) {
        res.cookies.set("sf_admin_gradient", gradientPreset, {
          httpOnly: false, maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax",
        });
      }
      return res;
    }

    if (!session.staffId) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 400 });
    }

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

    const existingPrefs = (data.preferences as Record<string, unknown>) ?? {};
    const updatedPrefs: Record<string, unknown> = { ...existingPrefs };
    if (darkMode !== undefined) updatedPrefs.darkMode = darkMode;
    if (gradientPreset !== undefined) updatedPrefs.gradientPreset = gradientPreset;

    const updatedData = { ...data, preferences: updatedPrefs };
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
