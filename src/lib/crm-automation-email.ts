import "server-only";

import { Resend } from "resend";
import { buildEmailAttachments, type EmailMediaItem } from "@/lib/crm-email-media";

export type AutomationEmailOutcome = "sent" | "definitive_failure" | "delivery_unknown";

export interface AutomationEmailResult {
  outcome: AutomationEmailOutcome;
  providerMessageId?: string;
  error?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildAutomationEmailHtml(
  body: string,
  tracking?: { openUrl: string; clickBaseUrl: string },
): string {
  if (!tracking) return escapeHtml(body).replace(/\n/g, "<br>");
  const urlPattern = /https?:\/\/[^\s]+/g;
  let html = "";
  let cursor = 0;
  for (const match of body.matchAll(urlPattern)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const trailing = raw.match(/[),.;!?]+$/)?.[0] || "";
    const destination = trailing ? raw.slice(0, -trailing.length) : raw;
    html += escapeHtml(body.slice(cursor, index));
    const trackedUrl = `${tracking.clickBaseUrl}${encodeURIComponent(destination)}`;
    html += `<a href="${escapeHtml(trackedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(destination)}</a>${escapeHtml(trailing)}`;
    cursor = index + raw.length;
  }
  html += escapeHtml(body.slice(cursor));
  html = html.replace(/\n/g, "<br>");
  return `${html}<img src="${escapeHtml(tracking.openUrl)}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px" />`;
}

export function isAmbiguousAutomationEmailError(error: string): boolean {
  const value = error.toLocaleLowerCase("vi");
  return [
    "timeout", "timed out", "network", "fetch failed", "econn", "socket",
    "connection reset", "http 500", "http 502", "http 503", "http 504", "unknown",
  ].some(token => value.includes(token));
}

export function getAutomationEmailProviderStatus() {
  const fromEmail = process.env.RESEND_FROM_EMAIL || "b2b@smartfurni.com.vn";
  return {
    configured: Boolean(process.env.RESEND_API_KEY && fromEmail),
    provider: "Resend HTTP API",
    host: "api.resend.com",
    user: fromEmail,
    fromEmail,
    fromName: process.env.RESEND_FROM_NAME || "SmartFurni B2B",
  };
}

export async function sendAutomationEmail(input: {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  media?: EmailMediaItem[];
  tracking?: { openUrl: string; clickBaseUrl: string };
}): Promise<AutomationEmailResult> {
  const recipient = input.to.trim();
  if (!/^\S+@\S+\.\S+$/.test(recipient)) {
    return { outcome: "definitive_failure", error: "Khách hàng chưa có email hợp lệ." };
  }
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) {
    return { outcome: "definitive_failure", error: "RESEND_API_KEY chưa được cấu hình." };
  }

  // Chuẩn hóa media là bước tiền kiểm. Nếu lỗi ở đây thì chắc chắn chưa gọi nhà cung cấp,
  // do đó có thể chuyển sang kênh dự phòng mà không sợ gửi trùng.
  let attachments;
  try {
    attachments = await buildEmailAttachments(input.media || []);
  } catch (error) {
    return {
      outcome: "definitive_failure",
      error: error instanceof Error ? error.message : "Không chuẩn bị được tệp đính kèm email.",
    };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "b2b@smartfurni.com.vn";
  const fromName = input.fromName?.trim() || process.env.RESEND_FROM_NAME || "SmartFurni B2B";
  try {
    const result = await new Resend(apiKey).emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [recipient],
      subject: input.subject,
      text: input.body,
      html: buildAutomationEmailHtml(input.body, input.tracking),
      attachments,
    });
    if (result.error) {
      return {
        outcome: "definitive_failure",
        error: result.error.message || "Resend từ chối email.",
      };
    }
    return { outcome: "sent", providerMessageId: result.data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return {
      outcome: isAmbiguousAutomationEmailError(message) ? "delivery_unknown" : "definitive_failure",
      error: message,
    };
  }
}
