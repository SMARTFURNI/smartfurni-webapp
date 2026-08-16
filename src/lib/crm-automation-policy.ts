import "server-only";

import { queryOne } from "@/lib/db";
import type { Lead } from "@/lib/crm-types";
import { getAutomationContactPolicy } from "@/lib/crm-automation-store";

export type AutomationOutboundChannel = "zalo_personal" | "zalo_oa" | "email";

export interface ContactPolicyDecision {
  allowed: boolean;
  code: "allowed" | "policy_disabled" | "do_not_contact" | "quiet_hours" | "frequency_cap" | "duplicate" | "email_suppressed" | "circuit_breaker";
  reason: string;
  retryAt?: string;
}

export interface AutomationCircuitHealth { channel: AutomationOutboundChannel; attempts: number; failed: number; failureRate: number; open: boolean }

export async function getAutomationCircuitHealth(channel: AutomationOutboundChannel): Promise<AutomationCircuitHealth> {
  const policy = await getAutomationContactPolicy();
  const logChannel = channel === "email" ? "email" : "zalo";
  const row = await queryOne<{ attempts: string; failed: string }>(
    `SELECT COUNT(*)::text AS attempts,COUNT(*) FILTER (WHERE status='failed')::text AS failed
     FROM crm_notification_logs WHERE channel=$1 AND status IN ('sent','failed') AND sent_at>=NOW()-INTERVAL '30 minutes'`,
    [logChannel],
  ).catch(() => ({ attempts: "0", failed: "0" }));
  const attempts = Number(row?.attempts || 0);
  const failed = Number(row?.failed || 0);
  const failureRate = attempts ? Math.round(failed * 1000 / attempts) / 10 : 0;
  return { channel, attempts, failed, failureRate, open: attempts >= policy.autoPauseMinimumAttempts && failureRate >= policy.autoPauseFailureRate };
}

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function localMinutes(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find(part => part.type === "hour")?.value || 0);
  const minute = Number(parts.find(part => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function clockMinutes(value: string): number {
  const [hour, minute] = String(value || "00:00").split(":").map(Number);
  return Math.max(0, Math.min(1439, (hour || 0) * 60 + (minute || 0)));
}

function insideQuietHours(now: number, start: number, end: number): boolean {
  return start === end ? false : start < end ? now >= start && now < end : now >= start || now < end;
}

function nextQuietEnd(endMinutes: number): string {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const target = new Date(local);
  target.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  if (target <= local) target.setDate(target.getDate() + 1);
  return new Date(now.getTime() + (target.getTime() - local.getTime())).toISOString();
}

export async function evaluateAutomationContact(input: {
  lead: Lead;
  channel: AutomationOutboundChannel;
  message: string;
  ignoreQuietHours?: boolean;
}): Promise<ContactPolicyDecision> {
  const policy = await getAutomationContactPolicy();
  if (!policy.enabled) return { allowed: true, code: "policy_disabled", reason: "Chính sách liên hệ đang tắt." };

  const circuit = await getAutomationCircuitHealth(input.channel);
  if (circuit.open) {
    return { allowed: false, code: "circuit_breaker", reason: `Kênh tạm dừng tự động do tỷ lệ lỗi ${circuit.failureRate}%/${circuit.attempts} lượt trong 30 phút.` };
  }

  const blockedTags = new Set(policy.doNotContactTags.map(normalized));
  const matchedTag = (input.lead.tags || []).find(tag => blockedTags.has(normalized(tag)));
  if (matchedTag) {
    return { allowed: false, code: "do_not_contact", reason: `Lead có nhãn không liên hệ: ${matchedTag}.` };
  }

  if (!input.ignoreQuietHours) {
    const start = clockMinutes(policy.quietHoursStart);
    const end = clockMinutes(policy.quietHoursEnd);
    if (insideQuietHours(localMinutes(), start, end)) {
      return { allowed: false, code: "quiet_hours", reason: "Đang trong giờ yên lặng.", retryAt: nextQuietEnd(end) };
    }
  }

  if (input.channel === "email" && (policy.suppressBouncedEmails || policy.suppressComplainedEmails)) {
    const suppressed = await queryOne<{ event_type: string }>(
      `SELECT event_type FROM crm_journey_events
       WHERE lead_id=$1 AND event_type = ANY($2::text[])
       ORDER BY occurred_at DESC LIMIT 1`,
      [input.lead.id, [
        ...(policy.suppressBouncedEmails ? ["bounced"] : []),
        ...(policy.suppressComplainedEmails ? ["complained"] : []),
      ]],
    ).catch(() => null);
    if (suppressed) {
      return { allowed: false, code: "email_suppressed", reason: `Email đã bị chặn do sự kiện ${suppressed.event_type}.` };
    }
  }

  const sent = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM crm_notification_logs
     WHERE lead_id=$1 AND status='sent' AND sent_at >= NOW() - INTERVAL '7 days'
       AND COALESCE(action_type,'') NOT LIKE 'automation_test_%'`,
    [input.lead.id],
  ).catch(() => ({ count: "0" }));
  if (Number(sent?.count || 0) >= policy.maxMessagesPerSevenDays) {
    return { allowed: false, code: "frequency_cap", reason: `Đã đạt giới hạn ${policy.maxMessagesPerSevenDays} tin/7 ngày.` };
  }

  const duplicate = await queryOne<{ id: string }>(
    `SELECT id FROM crm_notification_logs
     WHERE lead_id=$1 AND status='sent' AND channel=$2 AND message=$3
       AND sent_at >= NOW() - ($4::text || ' minutes')::interval LIMIT 1`,
    [input.lead.id, input.channel === "zalo_personal" ? "zalo" : input.channel === "zalo_oa" ? "zalo" : "email", input.message, policy.dedupeWindowMinutes],
  ).catch(() => null);
  if (duplicate) {
    return { allowed: false, code: "duplicate", reason: `Nội dung giống nhau đã được gửi trong ${policy.dedupeWindowMinutes} phút gần đây.` };
  }

  return { allowed: true, code: "allowed", reason: "Đạt chính sách liên hệ." };
}
