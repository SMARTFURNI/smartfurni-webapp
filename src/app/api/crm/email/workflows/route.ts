import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getEmailWorkflows, saveEmailWorkflow } from "@/lib/email-marketing-store";
import type { EmailWorkflow } from "@/lib/email-marketing-store";

function generateId() {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const workflows = await getEmailWorkflows();
    // Normalize to UI-friendly format
    const normalized = workflows.map(wf => ({
      id: wf.id,
      name: wf.name,
      description: (wf as any).description || "",
      triggerType: wf.triggerType,
      status: wf.status,
      steps: (wf.steps || []).map((s: any, i: number) => ({
        id: s.id || generateId(),
        stepOrder: s.stepOrder ?? i + 1,
        delayDays: s.config?.delayDays ?? s.delayDays ?? 0,
        templateId: s.config?.templateId ?? s.templateId ?? "",
        templateName: s.config?.templateName ?? s.templateName ?? "",
        subject: s.config?.subject ?? s.subject ?? "",
      })),
      createdAt: wf.createdAt,
      runCount: (wf as any).runCount ?? 0,
    }));
    return NextResponse.json(normalized);
  } catch (err) {
    console.error("GET /api/crm/email/workflows error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const id = generateId();

    const steps = (body.steps || []).map((s: any, i: number) => ({
      id: generateId(),
      stepOrder: i + 1,
      type: "action_send_email" as const,
      config: {
        templateId: s.templateId || "",
        subject: s.subject || "",
        delayDays: s.delayDays ?? 0,
      },
      nextStepId: null,
    }));

    const workflow: EmailWorkflow & { description?: string; runCount?: number } = {
      id,
      campaignId: "",
      name: body.name,
      description: body.description || "",
      triggerType: body.triggerType || "new_lead",
      triggerConfig: {},
      status: "active",
      steps,
      createdAt: now,
      updatedAt: now,
      runCount: 0,
    };

    await saveEmailWorkflow(workflow as EmailWorkflow);

    // Return UI-friendly format
    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      triggerType: workflow.triggerType,
      status: workflow.status,
      steps: steps.map((s: any) => ({
        id: s.id,
        stepOrder: s.stepOrder,
        delayDays: s.config.delayDays,
        templateId: s.config.templateId,
        templateName: "",
        subject: s.config.subject,
      })),
      createdAt: workflow.createdAt,
      runCount: 0,
    });
  } catch (err) {
    console.error("POST /api/crm/email/workflows error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const workflows = await getEmailWorkflows();
    const existing = workflows.find(w => w.id === id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = { ...existing, status: status || existing.status, updatedAt: new Date().toISOString() };
    await saveEmailWorkflow(updated);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/crm/email/workflows error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    // Mark as deleted by setting a special status
    const workflows = await getEmailWorkflows();
    const existing = workflows.find(w => w.id === id);
    if (existing) {
      await saveEmailWorkflow({ ...existing, status: "inactive", updatedAt: new Date().toISOString() });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
