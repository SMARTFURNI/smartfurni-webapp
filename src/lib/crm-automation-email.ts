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
      html: escapeHtml(input.body).replace(/\n/g, "<br>"),
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
