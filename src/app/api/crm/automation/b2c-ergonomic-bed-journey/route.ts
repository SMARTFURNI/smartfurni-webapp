import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getLead } from "@/lib/crm-store";
import { b2cErgonomicJourneyDefinitionWithOverrides } from "@/lib/crm-b2c-ergonomic-bed-journey";
import {
  enrollLeadInB2CErgonomicBedJourney,
  getB2CErgonomicBedJourneyDashboard,
  getB2CErgonomicBedJourneySettings,
  saveB2CErgonomicBedJourneySettings,
} from "@/lib/crm-b2c-ergonomic-bed-journey-store";
import { runB2CErgonomicBedJourney } from "@/lib/crm-b2c-ergonomic-bed-journey-engine";
import {
  cancelJourneyEnrollment,
  resumeJourneyEnrollment,
  updateJourneyContext,
} from "@/lib/crm-b2b-sofa-journey-store";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");
}

export async function GET() {
  try {
    await requireAdmin();
    const dashboard = await getB2CErgonomicBedJourneyDashboard();
    return NextResponse.json({
      definition: b2cErgonomicJourneyDefinitionWithOverrides(dashboard.settings),
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
      action?: "save_settings" | "run" | "enroll" | "resume" | "cancel" | "update_context";
      settings?: Record<string, unknown>;
      leadId?: string;
      enrollmentId?: string;
      context?: Record<string, string>;
      limit?: number;
    };

    if (body.action === "save_settings") {
      const settings = await saveB2CErgonomicBedJourneySettings(body.settings || {});
      return NextResponse.json({ ok: true, settings });
    }
    if (body.action === "run") {
      return NextResponse.json({ ok: true, result: await runB2CErgonomicBedJourney(body.limit || 20) });
    }
    if (body.action === "enroll") {
      if (!body.leadId) return NextResponse.json({ error: "Thiếu leadId" }, { status: 400 });
      const lead = await getLead(body.leadId);
      if (!lead) return NextResponse.json({ error: "Không tìm thấy lead" }, { status: 404 });
      const settings = await getB2CErgonomicBedJourneySettings();
      const result = await enrollLeadInB2CErgonomicBedJourney(lead, settings, {
        context: body.context,
        force: true,
      });
      return NextResponse.json({ ok: true, ...result });
    }
    if (body.action === "resume") {
      if (!body.enrollmentId) return NextResponse.json({ error: "Thiếu enrollmentId" }, { status: 400 });
      await resumeJourneyEnrollment(body.enrollmentId);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "cancel") {
      if (!body.enrollmentId) return NextResponse.json({ error: "Thiếu enrollmentId" }, { status: 400 });
      await cancelJourneyEnrollment(body.enrollmentId, "Dừng thủ công từ màn hình quản trị.");
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
