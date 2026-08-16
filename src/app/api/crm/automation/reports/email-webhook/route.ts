import { NextRequest, NextResponse } from "next/server";
import { Resend, type WebhookEventPayload } from "resend";
import { recordJourneyEmailProviderEvent } from "@/lib/crm-journey-reporting";
import type { JourneyReportEventType } from "@/lib/crm-journey-report-types";

export const dynamic = "force-dynamic";

function safeLink(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return "";
  }
}

function reportingEvent(event: WebhookEventPayload): {
  eventType: Extract<JourneyReportEventType, "delivered" | "bounced" | "complained" | "opened" | "clicked" | "failed" | "delivery_unknown">;
  metadata: Record<string, unknown>;
} | null {
  switch (event.type) {
    case "email.delivered":
      return { eventType: "delivered", metadata: { providerEvent: event.type } };
    case "email.bounced":
      return {
        eventType: "bounced",
        metadata: {
          providerEvent: event.type,
          bounceType: event.data.bounce.type,
          bounceSubType: event.data.bounce.subType,
        },
      };
    case "email.complained":
      return { eventType: "complained", metadata: { providerEvent: event.type } };
    case "email.opened":
      return { eventType: "opened", metadata: { providerEvent: event.type } };
    case "email.clicked":
      return {
        eventType: "clicked",
        metadata: { providerEvent: event.type, link: safeLink(event.data.click.link) },
      };
    case "email.failed":
      return { eventType: "failed", metadata: { providerEvent: event.type, reason: event.data.failed.reason.slice(0, 300) } };
    case "email.suppressed":
      return { eventType: "failed", metadata: { providerEvent: event.type, reason: event.data.suppressed.type.slice(0, 120) } };
    case "email.delivery_delayed":
      return { eventType: "delivery_unknown", metadata: { providerEvent: event.type } };
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET || "";
  if (!webhookSecret) {
    console.error("[Journey email webhook] RESEND_WEBHOOK_SECRET chưa được cấu hình");
    return NextResponse.json({ error: "Webhook chưa được cấu hình" }, { status: 503 });
  }

  const webhookId = req.headers.get("svix-id") || "";
  const timestamp = req.headers.get("svix-timestamp") || "";
  const signature = req.headers.get("svix-signature") || "";
  if (!webhookId || !timestamp || !signature) {
    return NextResponse.json({ error: "Thiếu chữ ký webhook" }, { status: 400 });
  }

  let event: WebhookEventPayload;
  try {
    // Xác thực webhook là thao tác cục bộ; khóa dự phòng chỉ giúp SDK khởi tạo
    // khi một môi trường chỉ cấu hình signing secret mà không gửi email.
    const resend = new Resend(process.env.RESEND_API_KEY || "re_webhook_verify_only");
    event = resend.webhooks.verify({
      payload: await req.text(),
      headers: { id: webhookId, timestamp, signature },
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: "Chữ ký webhook không hợp lệ" }, { status: 401 });
  }

  const mapped = reportingEvent(event);
  if (!mapped || !event.type.startsWith("email.") || !("email_id" in event.data)) {
    return NextResponse.json({ received: true, tracked: false }, { status: 202 });
  }

  try {
    const tracked = await recordJourneyEmailProviderEvent({
      providerMessageId: event.data.email_id,
      providerEventId: webhookId,
      eventType: mapped.eventType,
      occurredAt: event.created_at,
      metadata: mapped.metadata,
    });
    return NextResponse.json({ received: true, tracked }, { status: tracked ? 200 : 202 });
  } catch (error) {
    console.error("[Journey email webhook]", error);
    return NextResponse.json({ error: "Không ghi được sự kiện" }, { status: 500 });
  }
}
