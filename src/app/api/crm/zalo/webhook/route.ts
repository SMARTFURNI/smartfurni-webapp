import { NextRequest, NextResponse } from "next/server";
import {
  getZaloOAConfig,
  recordZaloWebhookEvent,
  recordZaloWebhookReceipt,
  verifyZaloWebhookSignature,
} from "@/lib/zalo-oa-store";

export const dynamic = "force-dynamic";

function webhookEventName(payload: Record<string, unknown>): string {
  const nested = payload.data && typeof payload.data === "object"
    ? payload.data as Record<string, unknown>
    : null;

  return String(nested?.event_name || payload.event_name || "").trim();
}

function okResponse(body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let payload: Record<string, unknown>;

  // Zalo Developer sends a connectivity probe before it lets the admin save
  // the webhook URL. The probe has no OA event and may not include a signature.
  // It must receive HTTP 200, but it must never enter the event-processing path.
  if (!rawBody.trim()) {
    return okResponse({ ok: true, verification: true });
  }

  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!webhookEventName(payload)) {
    return okResponse({ ok: true, verification: true });
  }

  const config = await getZaloOAConfig();
  const signature = req.headers.get("x-zevent-signature");
  if (!verifyZaloWebhookSignature(rawBody, signature, config)) {
    // Zalo Developer's "Kiểm tra" request can carry an event-shaped payload
    // without a production X-ZEvent-Signature. Acknowledge receipt so Zalo can
    // register the URL, but never process or persist an unsigned request.
    // Returning the same 200 acknowledgement also avoids exposing signature
    // validation details to callers.
    await recordZaloWebhookReceipt({
      eventName: webhookEventName(payload),
      status: "ignored",
      error: config.oaSecretKey
        ? "Chữ ký X-ZEvent-Signature không hợp lệ."
        : "Chưa cấu hình OA Secret Key riêng cho webhook.",
    }).catch(error => console.error("[Zalo OA webhook receipt]", error));
    console.warn("[Zalo OA webhook] ignored invalid signature", {
      eventName: webhookEventName(payload),
      signaturePresent: Boolean(signature),
      appIdConfigured: Boolean(config.appId),
      oaSecretKeyConfigured: Boolean(config.oaSecretKey),
    });
    return okResponse({ ok: true, ignored: true });
  }

  try {
    const result = await recordZaloWebhookEvent(payload);
    // Only inbound message events that actually create/update a CRM
    // conversation should become the connection health receipt. Zalo also
    // sends valid delivery/receipt events after the OA replies; recording
    // those as "ignored" would overwrite a successful inbound receipt and
    // make the settings screen report a false webhook failure.
    if (result.handled) {
      await recordZaloWebhookReceipt({
        eventName: webhookEventName(payload),
        status: "processed",
        error: "",
      });
    }
    return okResponse({ ok: true, ...result });
  } catch (error) {
    console.error("[Zalo OA webhook]", error);
    await recordZaloWebhookReceipt({
      eventName: webhookEventName(payload),
      status: "error",
      error: error instanceof Error ? error.message : "Không ghi được sự kiện webhook.",
    }).catch(receiptError => console.error("[Zalo OA webhook receipt]", receiptError));
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return okResponse({ ok: true, service: "SmartFurni Zalo OA webhook" });
}
