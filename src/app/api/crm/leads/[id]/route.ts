import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getLead, updateLead, deleteLead } from "@/lib/crm-store";
import { triggerStageChangeAutomation } from "@/lib/crm-automation-engine";
import { logAudit, getClientIp, resolveActorName } from "@/lib/audit-helper";
import { isLeadProfileUpdate, validateLeadProfileForUpdate } from "@/lib/crm-lead-profile-validation";
import { getNewLeadCallGate } from "@/lib/crm-new-lead-call-policy";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const payload = await req.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ" }, { status: 400 });
  }
  const updates = payload as Record<string, unknown>;

  // Luu stage cu truoc khi update de trigger automation
  const existingLead = await getLead(id);
  if (!existingLead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const prevStage = existingLead.stage;

  // Nhân viên không thể bỏ qua chuỗi gọi bằng một màn hình hoặc API khác.
  // Admin vẫn có quyền xử lý ngoại lệ vận hành.
  if (!session.isAdmin && existingLead.stage === "new" && updates.stage && updates.stage !== "new") {
    const callGate = await getNewLeadCallGate(existingLead);
    if (callGate.locked) {
      return NextResponse.json({ error: callGate.reason, callGate }, { status: 409 });
    }
    if (callGate.success) {
      // Việc đối soát lịch sử vừa tự động đưa khách sang "Đã báo giá";
      // không ghi đè ngay bằng lựa chọn cũ từ trình duyệt.
      return NextResponse.json(await getLead(id));
    }
  }

  if (isLeadProfileUpdate(updates)) {
    const validation = validateLeadProfileForUpdate({ ...existingLead, ...updates });
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors },
        { status: 422 },
      );
    }
  }

  const lead = await updateLead(id, updates);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { actorId, actorName } = await resolveActorName(session);
  const ip = getClientIp(req);

  // Trigger stage_changed automation neu stage thay doi
  if (prevStage && updates.stage && prevStage !== updates.stage) {
    triggerStageChangeAutomation(lead, prevStage).catch((e) =>
      console.error("[Automation] Stage change trigger error:", e)
    );
    // NOTE: Email workflow is handled inside triggerStageChangeAutomation (send_email_workflow action)
    // Do NOT call send-email-workflow route separately to avoid duplicate emails
    await logAudit({
      action: "lead.stage_changed",
      entityType: "lead",
      entityId: lead.id,
      entityName: lead.name || lead.phone || id,
      actorId,
      actorName,
      ipAddress: ip,
      changes: { stage: { before: prevStage, after: updates.stage } },
    });
  } else {
    await logAudit({
      action: "lead.updated",
      entityType: "lead",
      entityId: lead.id,
      entityName: lead.name || lead.phone || id,
      actorId,
      actorName,
      ipAddress: ip,
    });
  }

  return NextResponse.json(lead);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getLead(id);
  await deleteLead(id);
  const { actorId, actorName } = await resolveActorName(session);
  await logAudit({
    action: "lead.deleted",
    entityType: "lead",
    entityId: id,
    entityName: existing?.name || existing?.phone || id,
    actorId,
    actorName,
    ipAddress: getClientIp(req),
  });
  return NextResponse.json({ ok: true });
}
