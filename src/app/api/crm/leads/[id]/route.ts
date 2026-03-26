import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getLead, updateLead, deleteLead } from "@/lib/crm-store";
import { triggerStageChangeAutomation } from "@/lib/crm-automation-engine";

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
  const updates = await req.json();

  // Luu stage cu truoc khi update de trigger automation
  const existingLead = await getLead(id);
  const prevStage = existingLead?.stage;

  const lead = await updateLead(id, updates);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Trigger stage_changed automation neu stage thay doi
  if (prevStage && updates.stage && prevStage !== updates.stage) {
    // Fire-and-forget: khong block response
    triggerStageChangeAutomation(lead, prevStage).catch((e) =>
      console.error("[Automation] Stage change trigger error:", e)
    );
  }

  return NextResponse.json(lead);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteLead(id);
  return NextResponse.json({ ok: true });
}
