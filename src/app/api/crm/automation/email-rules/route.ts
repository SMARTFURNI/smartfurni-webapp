import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getCrmSettings, updateCrmSetting } from "@/lib/crm-settings-store";
import type { EmailWorkflowRule } from "@/lib/crm-settings-store";

/**
 * Email Workflow Rules API
 * Luu tru trong crm_settings voi key "emailRules" (MySQL/TiDB)
 * Thay the bang PostgreSQL crm_email_automation_rules cu
 */

export async function GET() {
  try {
    await requireCrmAccess();
    const settings = await getCrmSettings();
    return NextResponse.json(settings.emailRules ?? []);
  } catch (err) {
    console.error("[Email Rules GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireCrmAccess();
    const rules = await req.json();
    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const normalized: EmailWorkflowRule[] = rules.map((rule) => ({
      id: rule.id ?? `email_rule_${Date.now()}`,
      enabled: rule.enabled ?? true,
      name: rule.name ?? "",
      triggerStage: rule.triggerStage ?? "new",
      subject: rule.subject ?? "",
      body: rule.body ?? "",
      delayMinutes: rule.delayMinutes ?? 0,
      fromName: rule.fromName ?? "SmartFurni",
    }));
    await updateCrmSetting("emailRules", normalized);
    return NextResponse.json({ success: true, count: normalized.length });
  } catch (err) {
    console.error("[Email Rules POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
