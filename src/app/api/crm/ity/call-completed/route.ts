/**
 * ITY Call Completed Webhook (Call Logs)
 * POST /api/crm/ity/call-completed
 *
 * ITY gọi endpoint này khi kết thúc cuộc gọi, gửi đầy đủ thông tin cuộc gọi.
 * Bao gồm: callid, calldate, extension, phone, duration, billsec, status, recording URL
 *
 * Tài liệu ITY:
 * POST https://{domain_crm}/wsapi/{customer}/call_answered?secret={secret}
 * Body JSON:
 * {
 *   "callid": "{callid}",
 *   "calldate": "2019-08-16 15:29:30",
 *   "extension": "101",
 *   "phone": "090xxxx242",
 *   "duration": 23,
 *   "billsec": 11,
 *   "status": "ANSWERED",
 *   "recording": "{https://ip_tong_dai/link_file_ghi_am}",
 *   "userfield": "{userfield}"
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createCallLog, updateCallLog, initCallLogSchema } from "@/lib/crm-store";

export const dynamic = "force-dynamic";

// Map trạng thái ITY → CRM
function mapItyStatus(ityStatus: string): "answered" | "missed" | "busy" | "failed" {
  const s = (ityStatus || "").toUpperCase();
  if (s === "ANSWERED") return "answered";
  if (s === "NO ANSWER" || s === "NO_ANSWER" || s === "NOANSWER") return "missed";
  if (s === "BUSY") return "busy";
  return "failed";
}

export async function POST(req: NextRequest) {
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

  // Xác thực secret (từ query param hoặc body)
  const { searchParams } = new URL(req.url);
  const secret = (searchParams.get("secret") || body.secret || "") as string;
  const expectedSecret = process.env.ITY_WEBHOOK_SECRET || process.env.ITY_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  // Parse dữ liệu từ ITY
  const callid = (body.callid || body.call_id || `ity_${Date.now()}`) as string;
  const calldate = (body.calldate || body.call_date || new Date().toISOString()) as string;
  const extension = (body.extension || "") as string;
  const phone = (body.phone || "") as string;
  const duration = Number(body.duration || 0);
  const billsec = Number(body.billsec || body.bill_sec || 0);
  const ityStatus = (body.status || "ANSWERED") as string;
  const recordingUrl = (body.recording || body.recording_url || "") as string;
  const userfield = (body.userfield || "") as string;

  // Xác định direction: nếu có userfield bắt đầu bằng "lead_" thì là outbound
  // Nếu không, xác định dựa vào context
  const direction: "inbound" | "outbound" = userfield.startsWith("lead_") ? "outbound" : "outbound";

  // Parse calldate từ ITY format "2019-08-16 15:29:30" → ISO
  let startedAt: string;
  try {
    startedAt = new Date(calldate.replace(" ", "T") + "+07:00").toISOString();
  } catch {
    startedAt = new Date().toISOString();
  }

  const endedAt = new Date(new Date(startedAt).getTime() + duration * 1000).toISOString();

  try {
    await initCallLogSchema();

    const callLog = await createCallLog({
      callId: callid,
      callerNumber: direction === "outbound" ? extension : phone,
      receiverNumber: direction === "outbound" ? phone : extension,
      direction,
      status: mapItyStatus(ityStatus),
      duration: billsec, // Dùng billsec (thời gian đàm thoại thực sự)
      recordingUrl: recordingUrl || undefined,
      provider: "ity",
      startedAt,
      endedAt,
      note: userfield ? `userfield: ${userfield}` : undefined,
    });

    console.log(`[ITY call-completed] CallID: ${callid}, Status: ${ityStatus}, Duration: ${billsec}s, Recording: ${recordingUrl || "none"}`);

    return NextResponse.json({
      status: "ok",
      id: callLog.id,
      callId: callid,
      leadId: callLog.leadId,
    });
  } catch (err) {
    console.error("[ITY call-completed] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET — kiểm tra endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/crm/ity/call-completed",
    description: "ITY call-completed webhook — nhận thông tin cuộc gọi khi kết thúc",
    expectedFields: {
      callid: "ID cuộc gọi",
      calldate: "Thời gian bắt đầu (Y-m-d H:i:s)",
      extension: "Số máy lẻ",
      phone: "Số điện thoại",
      duration: "Tổng thời gian (giây)",
      billsec: "Thời gian đàm thoại (giây)",
      status: "ANSWERED | NO ANSWER | BUSY",
      recording: "URL file ghi âm",
      userfield: "Trường tùy chỉnh",
    },
  });
}
