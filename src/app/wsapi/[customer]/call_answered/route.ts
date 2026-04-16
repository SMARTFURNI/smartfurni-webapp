/**
 * ITY Call Answered Webhook - Alias Route
 * POST /wsapi/{customer}/call_answered?secret={secret}
 *
 * Đây là URL format chuẩn của ITY để gửi call log về CRM.
 * Theo tài liệu: https://docs.ity.vn/Options/apicrm.html
 *
 * Cấu hình trên ITY Portal:
 *   URL: https://your-crm.railway.app/wsapi/89866001/call_answered?secret=YOUR_SECRET
 *   Method: POST
 *
 * Route này chuyển tiếp request đến /api/crm/ity/call-completed để xử lý.
 */
import { NextRequest, NextResponse } from "next/server";
import { createCallLog, initCallLogSchema } from "@/lib/crm-store";

export const dynamic = "force-dynamic";

// Map trạng thái ITY → CRM
function mapItyStatus(ityStatus: string): "answered" | "missed" | "busy" | "failed" {
  const s = (ityStatus || "").toUpperCase();
  if (s === "ANSWERED") return "answered";
  if (s === "NO ANSWER" || s === "NO_ANSWER" || s === "NOANSWER" || s === "NO ANSER") return "missed";
  if (s === "BUSY") return "busy";
  return "failed";
}

function parseItyTime(s: string): string {
  if (!s) return new Date().toISOString();
  try {
    return new Date(s.replace(" ", "T") + "+07:00").toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { customer: string } }
) {
  let body: Record<string, unknown> = {};
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
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Xác thực customer
  const expectedCustomer = process.env.ITY_CUSTOMER || "89866001";
  if (params.customer !== expectedCustomer) {
    return NextResponse.json({ error: "Invalid customer" }, { status: 403 });
  }

  // Xác thực secret
  const { searchParams } = new URL(req.url);
  const secret = (searchParams.get("secret") || body.secret || "") as string;
  const expectedSecret = process.env.ITY_WEBHOOK_SECRET || process.env.ITY_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  // Parse dữ liệu từ ITY (theo spec docs.ity.vn)
  const callid = (body.callid || body.call_id || `ity_${Date.now()}`) as string;
  const startStamp = (body.start_stamp || body.calldate || body.call_date || new Date().toISOString()) as string;
  const endStamp = (body.end_stamp || "") as string;
  const extension = (body.extension || "") as string;
  const phone = (body.phone || "") as string;
  const duration = Number(body.duration || 0);
  const billsec = Number(body.billsec || body.bill_sec || 0);
  const ityStatus = (body.status || "ANSWERED") as string;
  const recordingUrl = (body.recording || body.recording_url || "") as string;
  const userfield = (body.userfield || "") as string;
  const directionRaw = (body.direction || "outbound") as string;
  const hotline = (body.hotline || "") as string;
  const hangupBy = (body.hangup_by || "") as string;
  const hangupCause = (body.hangup_cause || "") as string;
  const mos = body.mos ? String(body.mos) : undefined;

  const direction: "inbound" | "outbound" = directionRaw === "inbound" ? "inbound" : "outbound";

  const startedAt = parseItyTime(startStamp);
  const endedAt = endStamp
    ? parseItyTime(endStamp)
    : new Date(new Date(startedAt).getTime() + duration * 1000).toISOString();

  try {
    await initCallLogSchema();

    const noteParts: string[] = [];
    if (hotline) noteParts.push(`Hotline: ${hotline}`);
    if (hangupBy) noteParts.push(`Ngắt bởi: ${hangupBy}`);
    if (hangupCause) noteParts.push(`Lý do: ${hangupCause}`);
    if (mos) noteParts.push(`Chất lượng (MOS): ${mos}`);
    if (userfield) noteParts.push(`Userfield: ${userfield}`);
    const note = noteParts.join(" | ") || undefined;

    const callLog = await createCallLog({
      callId: callid,
      callerNumber: direction === "outbound" ? extension : phone,
      receiverNumber: direction === "outbound" ? phone : extension,
      direction,
      status: mapItyStatus(ityStatus),
      duration: billsec,
      recordingUrl: recordingUrl || undefined,
      provider: "ity",
      startedAt,
      endedAt,
      note,
    });

    console.log(`[ITY call_answered] CallID: ${callid}, Status: ${ityStatus}, Duration: ${billsec}s`);

    return NextResponse.json({
      status: "ok",
      id: callLog.id,
      callId: callid,
    });
  } catch (err) {
    console.error("[ITY call_answered] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET - kiểm tra endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/wsapi/{customer}/call_answered",
    description: "ITY Call Answered Webhook - nhận call log từ tổng đài ITY",
    method: "POST",
    note: "Đây là URL format chuẩn ITY. Cấu hình trên ITY Portal với URL này.",
  });
}
