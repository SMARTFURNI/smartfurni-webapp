import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { dbGetSetting } from "@/lib/db-store";

export const dynamic = "force-dynamic";

interface TikTokSession {
  sessionId: string;
  msToken: string;
  note: string;
  savedAt: string;
}

export async function GET() {
  try {
    await requireCrmAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await dbGetSetting<TikTokSession>("tiktok_session");

  if (!session || !session.sessionId) {
    return NextResponse.json({ connected: false, method: "cookie" });
  }

  return NextResponse.json({
    connected: true,
    method: "cookie",
    note: session.note || "",
    savedAt: session.savedAt,
    // Chỉ hiện 8 ký tự cuối để xác nhận, không lộ toàn bộ
    sessionIdHint: `...${session.sessionId.slice(-8)}`,
  });
}
