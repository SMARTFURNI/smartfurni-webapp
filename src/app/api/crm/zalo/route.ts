import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getZaloConfig } from "@/lib/crm-notifications-store";

// Zalo OA Webhook - receives messages from customers
export async function GET(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const config = await getZaloConfig();
  // Verify webhook
  if (searchParams.get("hub.verify_token") === config.webhookVerifyToken) {
    return new NextResponse(searchParams.get("hub.challenge") ?? "ok");
  }
  return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as Record<string, unknown>;
    const eventName = body.event_name as string;
    // Handle incoming Zalo messages
    if (eventName === "user_send_text") {
      const sender = (body.sender as Record<string, unknown>)?.id as string;
      const message = ((body.message as Record<string, unknown>)?.text as string) ?? "";
      console.log(`[Zalo OA] Message from ${sender}: ${message}`);
      // TODO: Match sender to lead by phone, create activity
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
