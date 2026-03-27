import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getEmailCampaigns, createEmailCampaign, getEmailTemplates,
  DEFAULT_TEMPLATES, createEmailTemplate,
} from "@/lib/crm-email-store";
import { getLeads } from "@/lib/crm-store";

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaigns = await getEmailCampaigns();
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === "seed_templates") {
    const existing = await getEmailTemplates();
    if (existing.length === 0) {
      for (const t of DEFAULT_TEMPLATES) {
        await createEmailTemplate(t);
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "count_recipients") {
    const leads = await getLeads();
    const segment = body.segment as string;
    const count = leads.filter(l => {
      if (segment === "all") return l.email;
      if (["architect","investor","dealer"].includes(segment)) return l.type === segment && l.email;
      if (["new","profile_sent","surveyed","quoted","negotiating","won","lost"].includes(segment)) return l.stage === segment && l.email;
      return l.email;
    }).filter(l => l.email).length;
    return NextResponse.json({ count });
  }

  const campaign = await createEmailCampaign({
    name: body.name,
    subject: body.subject,
    templateId: body.templateId,
    htmlContent: body.htmlContent || "",
    segment: body.segment || "all",
    scheduledAt: body.scheduledAt,
    createdBy: "Admin",
  });
  return NextResponse.json(campaign);
}
