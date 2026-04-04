import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import nodemailer from "nodemailer";
import { logNotification } from "@/lib/crm-notifications-store";

function replaceVars(template: string, lead: Record<string, string>): string {
  return template
    .replace(/\{\{name\}\}/g, lead.name ?? "Anh/Chị")
    .replace(/\{\{stage\}\}/g, lead.stage ?? "")
    .replace(/\{\{phone\}\}/g, lead.phone ?? "")
    .replace(/\{\{email\}\}/g, lead.email ?? "")
    .replace(/\{\{assignedTo\}\}/g, lead.assignedTo ?? "")
    .replace(/\{\{value\}\}/g, lead.value ?? "")
    .replace(/\{\{company\}\}/g, lead.company ?? "");
}

export async function POST(req: NextRequest) {
  try {
    const { leadId, toStage } = await req.json();
    if (!leadId || !toStage) {
      return NextResponse.json({ error: "Missing leadId or toStage" }, { status: 400 });
    }

    // Get lead info
    const leadRows = await query<Record<string, unknown>>(
      "SELECT * FROM crm_leads WHERE id=$1", [leadId]
    );
    const lead = leadRows[0];
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!lead.email) return NextResponse.json({ skipped: true, reason: "No email" });

    // Get matching email rules
    const rules = await query<Record<string, unknown>>(
      "SELECT * FROM crm_email_automation_rules WHERE trigger_stage=$1 AND enabled=true",
      [toStage]
    );
    if (rules.length === 0) return NextResponse.json({ skipped: true, reason: "No matching rules" });

    // Get SMTP config
    const configRows = await query<Record<string, unknown>>(
      "SELECT * FROM crm_email_smtp_config WHERE id='default'"
    );
    const config = configRows[0];
    if (!config?.host || !config?.smtp_user || !config?.smtp_pass) {
      return NextResponse.json({ skipped: true, reason: "SMTP not configured" });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: config.host as string,
      port: (config.port as number) ?? 587,
      secure: (config.secure as boolean) ?? false,
      auth: {
        user: config.smtp_user as string,
        pass: config.smtp_pass as string,
      },
    });

    const leadVars = {
      name: (lead.name as string) ?? "",
      stage: toStage,
      phone: (lead.phone as string) ?? "",
      email: (lead.email as string) ?? "",
      assignedTo: (lead.assigned_to as string) ?? "",
      value: lead.value ? `${Number(lead.value).toLocaleString("vi-VN")} đ` : "",
      company: (lead.company as string) ?? "",
    };

    const results = [];
    for (const rule of rules) {
      const subject = replaceVars((rule.subject as string) ?? "", leadVars);
      const body = replaceVars((rule.body as string) ?? "", leadVars);
      const fromName = (rule.from_name as string) ?? "SmartFurni";
      const fromEmail = (config.from_email as string) ?? (config.smtp_user as string);

      try {
        // Handle delay — log as pending and skip actual send for now
        if (rule.delay_minutes && (rule.delay_minutes as number) > 0) {
          await logNotification({
            ruleId: (rule.id as string) ?? "",
            ruleName: (rule.name as string) ?? "",
            channel: "email",
            recipient: lead.email as string,
            leadId: leadId,
            leadName: (lead.name as string) ?? "",
            message: subject,
            status: "pending",
            actionType: "send_email",
          });
          results.push({ ruleId: rule.id, status: "pending_delay" });
          continue;
        }

        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: lead.email as string,
          subject,
          text: body,
          html: body.replace(/\n/g, "<br>"),
        });

        await logNotification({
          ruleId: (rule.id as string) ?? "",
          ruleName: (rule.name as string) ?? "",
          channel: "email",
          recipient: lead.email as string,
          leadId: leadId,
          leadName: (lead.name as string) ?? "",
          message: subject,
          status: "sent",
          actionType: "send_email",
        });

        results.push({ ruleId: rule.id, status: "sent" });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        await logNotification({
          ruleId: (rule.id as string) ?? "",
          ruleName: (rule.name as string) ?? "",
          channel: "email",
          recipient: lead.email as string,
          leadId: leadId,
          leadName: (lead.name as string) ?? "",
          message: subject,
          status: "failed",
          error: errMsg,
          actionType: "send_email",
        });
        results.push({ ruleId: rule.id, status: "failed", error: errMsg });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error("[Email Workflow]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
