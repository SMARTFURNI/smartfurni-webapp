/**
 * ITY Incoming Call Webhook
 * GET /api/crm/ity/incoming-call
 *
 * ITY gọi endpoint này khi có cuộc gọi đến (Incoming call).
 * Params: phone, extension, callid
 *
 * Tài liệu ITY: 
 * GET https://{domain_crm}/wsapi/{customer}/incoming_call?secret={secret}&phone=090xxxxxxx&extension=101&callid={callid}
 */
import { NextRequest, NextResponse } from "next/server";
import { createCallLog, initCallLogSchema } from "@/lib/crm-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Xác thực secret
  const secret = searchParams.get("secret");
  const expectedSecret = process.env.ITY_WEBHOOK_SECRET || process.env.ITY_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const phone = searchParams.get("phone") || "";
  const extension = searchParams.get("extension") || "";
  const callid = searchParams.get("callid") || `ity_in_${Date.now()}`;
  const customer = searchParams.get("customer") || "";

  try {
    await initCallLogSchema();

    await createCallLog({
      callId: callid,
      callerNumber: phone,
      receiverNumber: extension,
      direction: "inbound",
      status: "missed", // Sẽ được cập nhật qua call-completed webhook
      duration: 0,
      provider: "ity",
      startedAt: new Date().toISOString(),
      note: `Cuộc gọi đến từ ${phone} → máy lẻ ${extension}`,
    }).catch(err => console.error("[ITY incoming] Lỗi tạo log:", err));

    console.log(`[ITY incoming] Phone: ${phone}, Extension: ${extension}, CallID: ${callid}`);

    return NextResponse.json({ status: "ok", callid, phone, extension });
  } catch (err) {
    console.error("[ITY incoming-call] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Hỗ trợ POST nếu ITY gửi POST
export async function POST(req: NextRequest) {
  let body: Record<string, string> = {};
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      text.split("&").forEach(pair => {
        const [k, v] = pair.split("=");
        if (k) body[decodeURIComponent(k)] = decodeURIComponent(v || "");
      });
    }
  } catch { /* ignore */ }

  const secret = body.secret || "";
  const expectedSecret = process.env.ITY_WEBHOOK_SECRET || process.env.ITY_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const phone = body.phone || "";
  const extension = body.extension || "";
  const callid = body.callid || `ity_in_${Date.now()}`;

  try {
    await initCallLogSchema();
    await createCallLog({
      callId: callid,
      callerNumber: phone,
      receiverNumber: extension,
      direction: "inbound",
      status: "missed",
      duration: 0,
      provider: "ity",
      startedAt: new Date().toISOString(),
    }).catch(err => console.error("[ITY incoming POST] Lỗi:", err));

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[ITY incoming-call POST] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
