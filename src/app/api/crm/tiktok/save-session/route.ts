import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { dbSaveSetting } from "@/lib/db-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/crm/tiktok/save-session
 * Lưu TikTok session cookie (sessionid) vào DB
 * Chỉ admin mới được gọi
 */
export async function POST(request: NextRequest) {
  try {
    await requireCrmAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, msToken, note } = body;

  if (!sessionId || !sessionId.trim()) {
    return NextResponse.json({ error: "sessionId không được để trống" }, { status: 400 });
  }

  await dbSaveSetting("tiktok_session", {
    sessionId: sessionId.trim(),
    msToken: (msToken || "").trim(),
    note: note || "",
    savedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
