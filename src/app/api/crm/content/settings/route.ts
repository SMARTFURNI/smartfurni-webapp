import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { loadContentSettings, updateContentSettings } from "@/lib/crm-content-store";

// GET /api/crm/content/settings — admin only
export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });

  try {
    const settings = await loadContentSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    console.error("[settings] GET error:", err);
    return NextResponse.json({ error: "Lỗi tải cài đặt", details: (err as Error).message }, { status: 500 });
  }
}

// PUT /api/crm/content/settings — admin only
export async function PUT(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });

  try {
    const body = await req.json();
    // Attach updatedBy from session
    const updates = { ...body, updatedBy: "admin" };
    const settings = await updateContentSettings(updates);
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    console.error("[settings] PUT error:", err);
    return NextResponse.json({ error: "Lỗi lưu cài đặt", details: (err as Error).message }, { status: 500 });
  }
}
