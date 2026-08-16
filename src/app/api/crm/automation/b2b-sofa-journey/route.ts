import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getLead } from "@/lib/crm-store";
import { B2B_SOFA_JOURNEY_CODE, journeyDefinitionWithOverrides } from "@/lib/crm-b2b-sofa-journey";
import {
  cancelJourneyEnrollment,
  completeJourneyEnrollment,
  enrollLeadInB2BSofaJourney,
  getB2BSofaJourneyDashboard,
  getB2BSofaJourneySettings,
  getJourneyReplyReview,
  pauseJourneyEnrollment,
  resolveJourneyReplyReview,
  resumeJourneyEnrollment,
  saveB2BSofaJourneySettings,
  updateJourneyContext,
} from "@/lib/crm-b2b-sofa-journey-store";
import {
  enrollLeadInB2CErgonomicBedJourney,
  getB2CErgonomicBedJourneySettings,
} from "@/lib/crm-b2c-ergonomic-bed-journey-store";
import { runB2BSofaJourney } from "@/lib/crm-b2b-sofa-journey-engine";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function GET() {
  try {
    await requireAdmin();
    const dashboard = await getB2BSofaJourneyDashboard();
    return NextResponse.json({
      definition: journeyDefinitionWithOverrides(dashboard.settings),
      ...dashboard,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json() as {
      action?: "save_settings" | "run" | "enroll" | "pause" | "resume" | "cancel" | "complete" | "review_reply" | "update_context";
      settings?: Record<string, unknown>;
      leadId?: string;
      enrollmentId?: string;
      context?: Record<string, string>;
      limit?: number;
      reviewId?: string;
      decision?: "continue" | "pause" | "switch" | "stop" | "complete";
      pauseHours?: number;
      pauseUntil?: string;
    };

    if (body.action === "save_settings") {
      const settings = await saveB2BSofaJourneySettings(body.settings || {});
      return NextResponse.json({ ok: true, settings });
    }
    if (body.action === "run") {
      return NextResponse.json({ ok: true, result: await runB2BSofaJourney(body.limit || 20) });
    }
    if (body.action === "enroll") {
      if (!body.leadId) return NextResponse.json({ error: "Thiếu leadId" }, { status: 400 });
      const lead = await getLead(body.leadId);
      if (!lead) return NextResponse.json({ error: "Không tìm thấy lead" }, { status: 404 });
      const settings = await getB2BSofaJourneySettings();
      const result = await enrollLeadInB2BSofaJourney(lead, settings, { context: body.context, force: true });
      return NextResponse.json({ ok: true, ...result });
    }
    if (body.action === "resume") {
      if (!body.enrollmentId) return NextResponse.json({ error: "Thiếu enrollmentId" }, { status: 400 });
      await resumeJourneyEnrollment(body.enrollmentId);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "pause") {
      if (!body.enrollmentId) return NextResponse.json({ error: "Thiếu enrollmentId" }, { status: 400 });
      const until = body.pauseUntil
        ? new Date(body.pauseUntil)
        : body.pauseHours ? new Date(Date.now() + Math.max(1, body.pauseHours) * 60 * 60 * 1000) : null;
      await pauseJourneyEnrollment(body.enrollmentId, "Nhân viên chủ động tạm dừng workflow.", until);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "cancel") {
      if (!body.enrollmentId) return NextResponse.json({ error: "Thiếu enrollmentId" }, { status: 400 });
      await cancelJourneyEnrollment(body.enrollmentId, "Dừng thủ công từ màn hình quản trị.");
      return NextResponse.json({ ok: true });
    }
    if (body.action === "complete") {
      if (!body.enrollmentId) return NextResponse.json({ error: "Thiếu enrollmentId" }, { status: 400 });
      await completeJourneyEnrollment(body.enrollmentId, "Nhân viên đánh dấu hoàn tất từ màn hình quản trị.");
      return NextResponse.json({ ok: true });
    }
    if (body.action === "review_reply") {
      if (!body.reviewId || !body.decision) return NextResponse.json({ error: "Thiếu reviewId hoặc decision" }, { status: 400 });
      const review = await getJourneyReplyReview(body.reviewId);
      if (!review) return NextResponse.json({ error: "Không tìm thấy đề xuất phản hồi" }, { status: 404 });
      if (review.journeyCode !== B2B_SOFA_JOURNEY_CODE) return NextResponse.json({ error: "Đề xuất không thuộc workflow này" }, { status: 409 });
      if (review.status !== "pending_review") return NextResponse.json({ error: "Đề xuất này đã được xử lý" }, { status: 409 });
      if (body.decision === "continue") {
        await resolveJourneyReplyReview(review.id, "dismissed", "admin");
      } else if (body.decision === "pause") {
        const until = body.pauseUntil
          ? new Date(body.pauseUntil)
          : new Date(Date.now() + Math.max(1, Math.min(720, body.pauseHours || 24)) * 60 * 60 * 1000);
        await pauseJourneyEnrollment(review.enrollmentId, `Nhân viên duyệt đề xuất AI: ${review.reason}`, until);
        await resolveJourneyReplyReview(review.id, "accepted", "admin");
      } else if (body.decision === "stop") {
        await cancelJourneyEnrollment(review.enrollmentId, `Nhân viên duyệt đề xuất AI: ${review.reason}`);
        await resolveJourneyReplyReview(review.id, "accepted", "admin");
      } else if (body.decision === "complete") {
        await completeJourneyEnrollment(review.enrollmentId, `Nhân viên duyệt đề xuất AI: ${review.reason}`);
        await resolveJourneyReplyReview(review.id, "accepted", "admin");
      } else if (body.decision === "switch") {
        const lead = await getLead(review.leadId);
        if (!lead) return NextResponse.json({ error: "Không tìm thấy lead" }, { status: 404 });
        const target = await enrollLeadInB2CErgonomicBedJourney(
          lead,
          await getB2CErgonomicBedJourneySettings(),
          { force: true },
        );
        if (!target.created && ["cancelled", "completed"].includes(target.enrollment.status)) {
          return NextResponse.json({ error: "Workflow đích của khách đã kết thúc; hãy xử lý thủ công trước khi chuyển." }, { status: 409 });
        }
        await cancelJourneyEnrollment(review.enrollmentId, "Đã chuyển sang workflow Giường công thái học.");
        await resolveJourneyReplyReview(review.id, "accepted", "admin");
      }
      return NextResponse.json({ ok: true });
    }
    if (body.action === "update_context") {
      if (!body.enrollmentId) return NextResponse.json({ error: "Thiếu enrollmentId" }, { status: 400 });
      const enrollment = await updateJourneyContext(body.enrollmentId, body.context || {});
      return NextResponse.json({ ok: true, enrollment });
    }
    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
