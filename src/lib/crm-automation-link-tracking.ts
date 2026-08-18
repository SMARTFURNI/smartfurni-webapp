import "server-only";

import { randomUUID } from "crypto";
import { query, queryOne } from "@/lib/db";
import { hasTrackableLinks, rewriteTrackedLinks } from "@/lib/crm-link-tracking-utils";

let automationLinkSchemaPromise: Promise<void> | null = null;

function publicOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || process.env.FRONTEND_URL
    || "https://www.smartfurni.com.vn"
  ).replace(/\/$/, "");
}

export async function initAutomationLinkTrackingSchema(): Promise<void> {
  if (!automationLinkSchemaPromise) {
    automationLinkSchemaPromise = query(`
      CREATE TABLE IF NOT EXISTS crm_automation_link_tracking (
        token TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        lead_id TEXT NOT NULL DEFAULT '',
        lead_name TEXT NOT NULL DEFAULT '',
        channel TEXT NOT NULL,
        clicked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_automation_link_clicks (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL REFERENCES crm_automation_link_tracking(token) ON DELETE CASCADE,
        url TEXT NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_crm_automation_link_tracking_clicked
        ON crm_automation_link_tracking(channel,clicked_at);
      CREATE INDEX IF NOT EXISTS idx_crm_automation_link_clicks_report
        ON crm_automation_link_clicks(occurred_at,token);
    `).then(() => undefined).catch(error => {
      automationLinkSchemaPromise = null;
      throw error;
    });
  }
  return automationLinkSchemaPromise;
}

export async function prepareAutomationTrackedMessage(input: {
  message: string;
  ruleId: string;
  ruleName: string;
  leadId?: string;
  leadName?: string;
  channel: "zalo_personal" | "zalo_oa";
}): Promise<string> {
  if (!hasTrackableLinks(input.message)) return input.message;
  await initAutomationLinkTrackingSchema();
  const token = randomUUID();
  await query(
    `INSERT INTO crm_automation_link_tracking
      (token,rule_id,rule_name,lead_id,lead_name,channel)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [token, input.ruleId, input.ruleName, input.leadId || "", input.leadName || "", input.channel],
  );
  const clickBaseUrl = `${publicOrigin()}/api/crm/automation/reports/email-click?t=${encodeURIComponent(token)}&u=`;
  return rewriteTrackedLinks(input.message, clickBaseUrl);
}

export async function recordAutomationLinkTrackingClick(
  token: string,
  url: string,
): Promise<boolean> {
  if (!token) return false;
  await initAutomationLinkTrackingSchema();
  const tracking = await queryOne<{ token: string }>(
    `SELECT token FROM crm_automation_link_tracking WHERE token=$1`,
    [token],
  );
  if (!tracking) return false;
  await query(
    `UPDATE crm_automation_link_tracking SET clicked_at=COALESCE(clicked_at,NOW()) WHERE token=$1`,
    [token],
  );
  await query(
    `INSERT INTO crm_automation_link_clicks (id,token,url) VALUES ($1,$2,$3)`,
    [randomUUID(), token, url],
  );
  return true;
}
