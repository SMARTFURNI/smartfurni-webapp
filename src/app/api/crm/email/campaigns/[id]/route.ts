import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getEmailCampaigns, updateEmailCampaign, deleteEmailCampaign } from "@/lib/crm-email-store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const campaigns = await getEmailCampaigns();
  const campaign = campaigns.find(c => c.id === id);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const updated = await updateEmailCampaign(id, {
    name: body.name,
    subject: body.subject,
    templateId: body.templateId,
    htmlContent: body.htmlContent,
    segment: body.segment,
    status: body.status,
    scheduledAt: body.scheduledAt,
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteEmailCampaign(id);
  return NextResponse.json({ ok: true });
}
