import { NextRequest, NextResponse } from "next/server";
import { logNotification } from "@/lib/crm-notifications-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import { getAutomationRules } from "@/lib/crm-automation-store";
import { getLead } from "@/lib/crm-store";
import { getMediaObject } from "@/lib/media-storage";
import { getZaloMediaAssets, incrementZaloMediaUsage } from "@/lib/zalo-media-library-store";
import { sendAutomationEmail } from "@/lib/crm-automation-email";
import { enqueueAutomationEmail } from "@/lib/crm-automation-execution-store";

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

    // Get lead using crm-store (returns fully parsed Lead object with all fields)
    const lead = await getLead(leadId);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!lead.email) return NextResponse.json({ skipped: true, reason: "No email on lead" });

    // ── Get email rules from shared PostgreSQL automation table (same as Zalo Workflow) ──
    // Rules are stored as AutomationRule with actions[].type === "send_email_workflow"
    let matchingRules: Array<{
      id: string;
      name: string;
      subject: string;
      body: string;
      fromName: string;
      delayMinutes: number;
      mediaAssetIds: string[];
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
            mediaAssetIds: action.mediaAssetIds ?? [],
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
          mediaAssetIds: [],
        }));
    }

    if (matchingRules.length === 0) {
      return NextResponse.json({ skipped: true, reason: "No matching email workflow rules" });
    }

    const leadVars = {
      name: lead.name ?? "",
      stage: toStage,
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      assignedTo: lead.assignedTo ?? "",
      value: lead.expectedValue ? `${Number(lead.expectedValue).toLocaleString("vi-VN")} đ` : "",
      company: (lead as unknown as Record<string, unknown>).company as string ?? "",
    };

    const results = [];
    for (const rule of matchingRules) {
      const subject = replaceVars(rule.subject ?? "", leadVars);
      const body = replaceVars(rule.body ?? "", leadVars);
      const ruleFromName = rule.fromName ?? "SmartFurni";

      try {
        // Email trì hoãn được lưu vào hàng đợi PostgreSQL và do CRM cron xử lý.
        if (rule.delayMinutes && rule.delayMinutes > 0) {
          const scheduledAt = new Date(Date.now() + rule.delayMinutes * 60_000);
          const queued = await enqueueAutomationEmail({
            dedupeKey: `stage-email:${rule.id}:${lead.id}:${toStage}:${lead.updatedAt || "unknown"}`,
            ruleId: rule.id,
            ruleName: rule.name,
            leadId: lead.id,
            leadName: lead.name,
            recipient: lead.email,
            subject,
            body,
            fromName: ruleFromName,
            mediaAssetIds: rule.mediaAssetIds,
            scheduledAt,
          });
          if (queued.queued) {
            await logNotification({
              ruleId: rule.id, ruleName: rule.name, channel: "email",
              recipient: lead.email, leadId, leadName: lead.name,
              message: subject, status: "pending", actionType: "send_email",
            });
          }
          results.push({ ruleId: rule.id, status: queued.queued ? "queued" : "deduplicated", scheduledAt });
          continue;
        }

        const assets = await getZaloMediaAssets([...new Set(rule.mediaAssetIds || [])].slice(0, 10));
        if (assets.length !== new Set(rule.mediaAssetIds || []).size) {
          throw new Error("Một hoặc nhiều media của mẫu không còn trong thư viện");
        }
        const media = await Promise.all(assets.map(async asset => {
          const object = await getMediaObject(asset.objectKey);
          if (!object.Body) throw new Error(`File ${asset.name} không còn trong thư viện`);
          return { asset, buffer: Buffer.from(await object.Body.transformToByteArray()) };
        }));

        const delivery = await sendAutomationEmail({
          to: lead.email,
          subject,
          body,
          fromName: ruleFromName,
          media,
        });
        if (delivery.outcome !== "sent") throw new Error(delivery.error || "Không gửi được email.");
        await incrementZaloMediaUsage(assets.map(asset => asset.id));

        await logNotification({
          ruleId: rule.id ?? "",
          ruleName: rule.name ?? "",
          channel: "email",
          recipient: lead.email ?? "",
          leadId: leadId,
          leadName: lead.name ?? "",
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
          recipient: lead.email ?? "",
          leadId: leadId,
          leadName: lead.name ?? "",
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
