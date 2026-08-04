import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import {
  cancelZaloGmfSchedule,
  generateZaloGmfContent,
  generateZaloGmfContentImage,
  getZaloGmfDashboard,
  retryZaloGmfSchedule,
  reviewZaloGmfContent,
  saveZaloGmfContent,
  saveZaloGmfGroupPreferences,
  saveZaloGmfSettings,
  scheduleZaloGmfContent,
  syncZaloGmfGroups,
  syncZaloGmfMembers,
  type ZaloGmfContent,
  type ZaloGmfSettings,
} from "@/lib/zalo-gmf-store";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown, status = 400) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Yêu cầu GMF không hợp lệ." }, { status });
}

export async function GET() {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await getZaloGmfDashboard()); }
  catch (error) { return errorResponse(error, 500); }
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action || "");
    const actor = session.isAdmin ? "admin" : String(session.staffId || "staff");
    const adminActions = new Set([
      "sync_groups", "sync_members", "review_content", "schedule_content", "cancel_schedule", "retry_schedule",
      "save_settings", "save_group_preferences",
    ]);
    if (adminActions.has(action) && !session.isAdmin) {
      return NextResponse.json({ ok: false, error: "Chỉ quản trị viên được duyệt, lên lịch và thay đổi vận hành GMF." }, { status: 403 });
    }
    if (action === "sync_groups") {
      const result = await syncZaloGmfGroups({ syncMembers: body.syncMembers !== false });
      return NextResponse.json({ ok: true, result });
    }
    if (action === "sync_members") {
      const result = await syncZaloGmfMembers(String(body.groupId || ""));
      return NextResponse.json({ ok: true, result });
    }
    if (action === "generate_content") {
      const content = await generateZaloGmfContent({
        objective: String(body.objective || ""),
        groupIds: Array.isArray(body.groupIds) ? body.groupIds.map(String) : [],
        linkUrl: String(body.linkUrl || ""),
      }, actor);
      return NextResponse.json({ ok: true, content });
    }
    if (action === "save_content") {
      const input = (body.content || {}) as Partial<ZaloGmfContent>;
      const content = await saveZaloGmfContent({ ...input, title: String(input.title || ""), body: String(input.body || "") }, actor);
      return NextResponse.json({ ok: true, content });
    }
    if (action === "generate_image") {
      const content = await generateZaloGmfContentImage(String(body.contentId || ""), actor);
      return NextResponse.json({ ok: true, content });
    }
    if (action === "review_content") {
      const decision = String(body.decision) === "reject" ? "reject" : "approve";
      const content = await reviewZaloGmfContent(String(body.contentId || ""), decision, actor, String(body.reason || ""));
      return NextResponse.json({ ok: true, content });
    }
    if (action === "schedule_content") {
      const result = await scheduleZaloGmfContent({
        contentId: String(body.contentId || ""),
        groupIds: Array.isArray(body.groupIds) ? body.groupIds.map(String) : [],
        scheduledAt: String(body.scheduledAt || ""),
      });
      return NextResponse.json({ ok: true, result });
    }
    if (action === "cancel_schedule") {
      await cancelZaloGmfSchedule(String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "retry_schedule") {
      await retryZaloGmfSchedule(String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "save_settings") {
      const settings = await saveZaloGmfSettings((body.settings || {}) as Partial<ZaloGmfSettings>);
      return NextResponse.json({ ok: true, settings });
    }
    if (action === "save_group_preferences") {
      await saveZaloGmfGroupPreferences(String(body.groupId || ""), {
        tag: body.tag == null ? undefined : String(body.tag),
        automationEnabled: body.automationEnabled == null ? undefined : Boolean(body.automationEnabled),
      });
      return NextResponse.json({ ok: true });
    }
    throw new Error("Hành động GMF chưa được hỗ trợ.");
  } catch (error) {
    return errorResponse(error);
  }
}
