import { NextRequest, NextResponse } from "next/server";
import {
  getZaloOAConfig,
  recordZaloWebhookEvent,
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
    return NextResponse.json({ error: "Invalid Zalo webhook signature" }, { status: 401 });
  }

  try {
    const result = await recordZaloWebhookEvent(payload);
    return okResponse({ ok: true, ...result });
  } catch (error) {
    console.error("[Zalo OA webhook]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return okResponse({ ok: true, service: "SmartFurni Zalo OA webhook" });
}
