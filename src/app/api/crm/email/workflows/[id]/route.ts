import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getEmailWorkflows, saveEmailWorkflow } from "@/lib/email-marketing-store";

function generateId() {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const workflows = await getEmailWorkflows();
  const wf = workflows.find(w => w.id === id);
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wf);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const workflows = await getEmailWorkflows();
  const existing = workflows.find(w => w.id === id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const steps = body.steps
    ? (body.steps || []).map((s: any, i: number) => ({
        id: s.id || generateId(),
        stepOrder: i + 1,
        type: "action_send_email" as const,
        config: {
          templateId: s.templateId || "",
          subject: s.subject || "",
          delayDays: s.delayDays ?? 0,
          delayHours: s.delayHours ?? 0,
          actionType: s.actionType || "send_email",
          taskTitle: s.taskTitle || "",
          tagToAdd: s.tagToAdd || "",
        },
        nextStepId: null,
      }))
    : existing.steps;

  const updated = {
    ...existing,
    name: body.name ?? existing.name,
    triggerType: body.triggerType ?? existing.triggerType,
    status: body.status ?? existing.status,
    steps,
    updatedAt: new Date().toISOString(),
  };
  await saveEmailWorkflow(updated);
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const workflows = await getEmailWorkflows();
  const existing = workflows.find(w => w.id === id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Hard delete by overwriting with inactive + deleted flag
  await saveEmailWorkflow({ ...existing, status: "inactive" as any, updatedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
