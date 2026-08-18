import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import {
  getZaloFriendshipSettings,
  getZaloFriendshipSummary,
  requestZaloFriendshipAction,
  runZaloFriendshipAutomation,
  updateZaloFriendshipSettings,
} from "@/lib/crm-zalo-friendship";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const leadId = new URL(req.url).searchParams.get("leadId");
  if (leadId) return NextResponse.json({ friendship: await getZaloFriendshipSummary(leadId) });
  if (!session.isAdmin) return NextResponse.json({ error: "Chỉ quản trị viên được xem cấu hình" }, { status: 403 });
  return NextResponse.json({ settings: await getZaloFriendshipSettings() });
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as { leadId?: string; action?: "retry" | "stop" | "resume" | "check" };
    if (!body.leadId || !body.action) {
      return NextResponse.json({ error: "Thiếu leadId hoặc action" }, { status: 400 });
    }
    await requestZaloFriendshipAction(body.leadId, body.action);
    if (body.action !== "stop") await runZaloFriendshipAutomation(20);
    return NextResponse.json({ ok: true, friendship: await getZaloFriendshipSummary(body.leadId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không xử lý được yêu cầu" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getCrmSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Chỉ quản trị viên được đổi cấu hình" }, { status: 403 });
  const updates = await req.json();
  return NextResponse.json({ settings: await updateZaloFriendshipSettings(updates) });
}
