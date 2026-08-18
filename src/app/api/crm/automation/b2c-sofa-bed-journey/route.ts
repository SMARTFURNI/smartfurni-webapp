import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getLead } from "@/lib/crm-store";
import { B2C_SOFA_BED_JOURNEY_CODE, b2cSofaBedJourneyDefinitionWithOverrides } from "@/lib/crm-b2c-sofa-bed-journey";
import {
  enrollLeadInB2CSofaBedJourney,
  getB2CSofaBedJourneyDashboard,
  getB2CSofaBedJourneySettings,
  saveB2CSofaBedJourneySettings,
} from "@/lib/crm-b2c-sofa-bed-journey-store";
import { runB2CSofaBedJourney } from "@/lib/crm-b2c-sofa-bed-journey-engine";
import {
  cancelJourneyEnrollment,
  completeJourneyEnrollment,
  getEnrollmentById,
  getJourneyReplyReview,
  pauseJourneyEnrollment,
  resolveJourneyReplyReview,
  resumeJourneyEnrollment,
  updateJourneyContext,
} from "@/lib/crm-b2b-sofa-journey-store";
import { saveAutomationConfigVersion } from "@/lib/crm-automation-governance";
import { logAudit, getClientIp } from "@/lib/audit-helper";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  if (!await getAdminSession()) throw new Error("UNAUTHORIZED");
}

export async function GET() {
  try {
    await requireAdmin();
    const dashboard = await getB2CSofaBedJourneyDashboard();
    return NextResponse.json({ definition: b2cSofaBedJourneyDefinitionWithOverrides(dashboard.settings), ...dashboard });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json() as {
      action?: "save_settings" | "save_draft" | "run" | "enroll" | "pause" | "resume" | "cancel" | "complete" | "review_reply" | "update_context";
      settings?: Record<string, unknown>; leadId?: string; enrollmentId?: string; context?: Record<string, string>;
      limit?: number; reviewId?: string; decision?: "continue" | "pause" | "stop" | "complete";
      pauseHours?: number; pauseUntil?: string;
    };

    if (body.action === "save_draft") {
      const version = await saveAutomationConfigVersion({ scope: "b2c_sofa", snapshot: body.settings || {}, status: "draft", note: "Bản nháp workflow khách lẻ Sofa Giường", actorId: "admin", actorName: "Admin" });
      return NextResponse.json({ ok: true, applied: false, version });
    }
    if (body.action === "save_settings") {
      const settings = await saveB2CSofaBedJourneySettings(body.settings || {});
      const version = await saveAutomationConfigVersion({ scope: "b2c_sofa", snapshot: settings, status: "published", note: "Lưu workflow khách lẻ Sofa Giường", actorId: "admin", actorName: "Admin" });
      await logAudit({ action: "automation.config_saved", entityType: "automation", entityId: "b2c_sofa", entityName: "Khách lẻ Sofa Giường 90 ngày", actorId: "admin", actorName: "Admin", ipAddress: getClientIp(req), metadata: { version: version.version } });
      return NextResponse.json({ ok: true, settings, version });
    }
    if (body.action === "run") return NextResponse.json({ ok: true, result: await runB2CSofaBedJourney(body.limit || 20) });
    if (body.action === "enroll") {
      if (!body.leadId) return NextResponse.json({ error: "Thiếu leadId" }, { status: 400 });
      const lead = await getLead(body.leadId);
      if (!lead) return NextResponse.json({ error: "Không tìm thấy lead" }, { status: 404 });
      const result = await enrollLeadInB2CSofaBedJourney(lead, await getB2CSofaBedJourneySettings(), { context: body.context, force: true });
      return NextResponse.json({ ok: true, ...result });
    }
    if (body.action === "resume") {
      if (!body.enrollmentId) return NextResponse.json({ error: "Thiếu enrollmentId" }, { status: 400 });
      const enrollment = await getEnrollmentById(body.enrollmentId);
      const lead = enrollment ? await getLead(enrollment.leadId) : null;
      if (!lead || lead.zaloFriendship?.status !== "accepted") return NextResponse.json({ error: "Chỉ có thể tiếp tục sau khi Zalo cá nhân đã kết bạn lại." }, { status: 409 });
      await resumeJourneyEnrollment(body.enrollmentId);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "pause") {
      if (!body.enrollmentId) return NextResponse.json({ error: "Thiếu enrollmentId" }, { status: 400 });
      const until = body.pauseUntil ? new Date(body.pauseUntil) : body.pauseHours ? new Date(Date.now() + Math.max(1, body.pauseHours) * 3_600_000) : null;
      await pauseJourneyEnrollment(body.enrollmentId, "Nhân viên chủ động tạm dừng workflow.", until);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "cancel" || body.action === "complete") {
      if (!body.enrollmentId) return NextResponse.json({ error: "Thiếu enrollmentId" }, { status: 400 });
      if (body.action === "cancel") await cancelJourneyEnrollment(body.enrollmentId, "Dừng thủ công từ màn hình quản trị.");
      else await completeJourneyEnrollment(body.enrollmentId, "Nhân viên đánh dấu hoàn tất từ màn hình quản trị.");
      return NextResponse.json({ ok: true });
    }
    if (body.action === "review_reply") {
      if (!body.reviewId || !body.decision) return NextResponse.json({ error: "Thiếu reviewId hoặc decision" }, { status: 400 });
      const review = await getJourneyReplyReview(body.reviewId);
      if (!review) return NextResponse.json({ error: "Không tìm thấy đề xuất phản hồi" }, { status: 404 });
      if (review.journeyCode !== B2C_SOFA_BED_JOURNEY_CODE) return NextResponse.json({ error: "Đề xuất không thuộc workflow này" }, { status: 409 });
      if (review.status !== "pending_review") return NextResponse.json({ error: "Đề xuất này đã được xử lý" }, { status: 409 });
      if (body.decision === "continue") await resolveJourneyReplyReview(review.id, "dismissed", "admin");
      else if (body.decision === "pause") {
        const until = body.pauseUntil ? new Date(body.pauseUntil) : new Date(Date.now() + Math.max(1, Math.min(720, body.pauseHours || 24)) * 3_600_000);
        await pauseJourneyEnrollment(review.enrollmentId, `Nhân viên duyệt đề xuất AI: ${review.reason}`, until);
        await resolveJourneyReplyReview(review.id, "accepted", "admin");
      } else if (body.decision === "stop") {
        await cancelJourneyEnrollment(review.enrollmentId, `Nhân viên duyệt đề xuất AI: ${review.reason}`);
        await resolveJourneyReplyReview(review.id, "accepted", "admin");
      } else if (body.decision === "complete") {
        await completeJourneyEnrollment(review.enrollmentId, `Nhân viên duyệt đề xuất AI: ${review.reason}`);
        await resolveJourneyReplyReview(review.id, "accepted", "admin");
      }
      return NextResponse.json({ ok: true });
    }
    if (body.action === "update_context") {
      if (!body.enrollmentId) return NextResponse.json({ error: "Thiếu enrollmentId" }, { status: 400 });
      return NextResponse.json({ ok: true, enrollment: await updateJourneyContext(body.enrollmentId, body.context || {}) });
    }
    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
