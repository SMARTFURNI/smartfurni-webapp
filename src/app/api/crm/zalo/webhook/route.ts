import { NextRequest, NextResponse } from "next/server";
import {
  getZaloOAConfig,
  recordZaloWebhookEvent,
  verifyZaloWebhookSignature,
} from "@/lib/zalo-oa-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = await getZaloOAConfig();
  const signature = req.headers.get("x-zevent-signature");
  if (!verifyZaloWebhookSignature(rawBody, signature, config)) {
    return NextResponse.json({ error: "Invalid Zalo webhook signature" }, { status: 401 });
  }

  try {
    const result = await recordZaloWebhookEvent(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[Zalo OA webhook]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "SmartFurni Zalo OA webhook" });
}
