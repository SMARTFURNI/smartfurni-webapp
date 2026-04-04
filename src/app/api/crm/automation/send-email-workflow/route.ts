import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import nodemailer from "nodemailer";
import { logNotification } from "@/lib/crm-notifications-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import { getAutomationRules } from "@/lib/crm-automation-store";

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

    // Get lead info from MySQL
    const leadRows = await query<Record<string, unknown>>(
      "SELECT * FROM crm_leads WHERE id=$1", [leadId]
    );
    const lead = leadRows[0];
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!lead.email) return NextResponse.json({ skipped: true, reason: "No email" });

    // ── Get email rules from shared PostgreSQL automation table (same as Zalo Workflow) ──
    // Rules are stored as AutomationRule with actions[].type === "send_email_workflow"
    let matchingRules: Array<{
      id: string;
      name: string;
      subject: string;
      body: string;
      fromName: string;
      delayMinutes: number;
    }> = [];

    try {
      const allAutomationRules = await getAutomationRules();
      matchingRules = allAutomationRules
        .filter(r =>
          r.enabled &&
          r.trigger.type === "stage_changed" &&
          r.trigger.toStage === toStage &&
          r.actions.some(a => a.type === "send_email_workflow")
        )
        .map(r => {
          const action = r.actions.find(a => a.type === "send_email_workflow")!;
          return {
            id: r.id,
            name: r.name,
            subject: action.emailSubject ?? "",
            body: action.emailBody ?? "",
            fromName: action.emailFromName ?? "SmartFurni",
            delayMinutes: action.emailDelayMinutes ?? 0,
          };
        });
    } catch {
      // PostgreSQL may not be available, fall back to legacy MySQL emailRules
      const crmSettings = await getCrmSettings();
      const legacyRules = (crmSettings.emailRules ?? []) as Array<{
        id: string; name: string; triggerStage: string; enabled: boolean;
        subject: string; body: string; fromName: string; delayMinutes: number;
      }>;
      matchingRules = legacyRules
        .filter(r => r.triggerStage === toStage && r.enabled)
        .map(r => ({
          id: r.id,
          name: r.name,
          subject: r.subject ?? "",
          body: r.body ?? "",
          fromName: r.fromName ?? "SmartFurni",
          delayMinutes: r.delayMinutes ?? 0,
        }));
    }

    if (matchingRules.length === 0) {
      return NextResponse.json({ skipped: true, reason: "No matching email workflow rules" });
    }

    // ── Get SMTP config from Email Marketing settings (crm_settings key "email") ──
    const crmSettings = await getCrmSettings();
    const emailCfg = crmSettings.email;

    let smtpHost = emailCfg?.smtpHost ?? "";
    let smtpPort = emailCfg?.smtpPort ?? 587;
    let smtpUser = emailCfg?.smtpUser ?? "";
    let smtpPass = emailCfg?.smtpPassword ?? "";
    let fromEmail = emailCfg?.senderEmail ?? emailCfg?.smtpUser ?? "";
    let fromName = (emailCfg as unknown as Record<string, unknown>)?.senderName as string ?? "SmartFurni";
    let secure = smtpPort === 465;

    // If Email Marketing SMTP not configured, fall back to legacy PostgreSQL table
    if (!smtpHost || !smtpUser || !smtpPass) {
      try {
        const configRows = await query<Record<string, unknown>>(
          "SELECT * FROM crm_email_smtp_config WHERE id='default'"
        );
        const legacyConfig = configRows[0];
        if (legacyConfig?.host && legacyConfig?.smtp_user && legacyConfig?.smtp_pass) {
          smtpHost = legacyConfig.host as string;
          smtpPort = (legacyConfig.port as number) ?? 587;
          smtpUser = legacyConfig.smtp_user as string;
          smtpPass = legacyConfig.smtp_pass as string;
          fromEmail = (legacyConfig.from_email as string) ?? smtpUser;
          fromName = (legacyConfig.from_name as string) ?? "SmartFurni";
          secure = (legacyConfig.secure as boolean) ?? false;
        }
      } catch {
        // Legacy table may not exist, ignore
      }
    }

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({ skipped: true, reason: "SMTP not configured" });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
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
    for (const rule of matchingRules) {
      const subject = replaceVars(rule.subject ?? "", leadVars);
      const body = replaceVars(rule.body ?? "", leadVars);
      const ruleFromName = rule.fromName ?? fromName;
      const ruleFromEmail = fromEmail || smtpUser;

      try {
        // Handle delay — log as pending and skip actual send for now
        if (rule.delayMinutes && rule.delayMinutes > 0) {
          await logNotification({
            ruleId: rule.id ?? "",
            ruleName: rule.name ?? "",
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
          from: `"${ruleFromName}" <${ruleFromEmail}>`,
          to: lead.email as string,
          subject,
          text: body,
          html: body.replace(/\n/g, "<br>"),
        });

        await logNotification({
          ruleId: rule.id ?? "",
          ruleName: rule.name ?? "",
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
          ruleId: rule.id ?? "",
          ruleName: rule.name ?? "",
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
