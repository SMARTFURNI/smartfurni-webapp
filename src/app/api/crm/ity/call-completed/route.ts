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
  // Cho phép gọi từ internal (same-origin) không cần secret
  const referer = req.headers.get("referer") || "";
  const origin = req.headers.get("origin") || "";
  const host = req.headers.get("host") || "";
  const isInternal = referer.includes(host) || origin.includes(host) || !origin;
  if (expectedSecret && secret !== expectedSecret && !isInternal) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  // Parse dữ liệu từ ITY (theo spec mới docs.ity.vn)
  const callid = (body.callid || body.call_id || `ity_${Date.now()}`) as string;
  // ITY gửi start_stamp thay vì calldate
  const startStamp = (body.start_stamp || body.calldate || body.call_date || new Date().toISOString()) as string;
  const answerStamp = (body.answer_stamp || "") as string; // reserved
  void answerStamp; // used for future analytics
  const endStamp = (body.end_stamp || "") as string;
  const extension = (body.extension || "") as string;
  const phone = (body.phone || "") as string;
  const duration = Number(body.duration || 0);
  const billsec = Number(body.billsec || body.bill_sec || 0);
  const ityStatus = (body.status || "ANSWERED") as string;
  const recordingUrl = (body.recording || body.recording_url || "") as string;
  const userfield = (body.userfield || "") as string;
  // Fields mới trong spec ITY 2025
  const directionRaw = (body.direction || "outbound") as string;
  const hotline = (body.hotline || "") as string;
  const domain = (body.domain || "") as string; void domain; // logged for debugging
  const hangupBy = (body.hangup_by || "") as string;
  const hangupCause = (body.hangup_cause || "") as string;
  const mos = body.mos ? String(body.mos) : undefined;

  const direction: "inbound" | "outbound" = directionRaw === "inbound" ? "inbound" : "outbound";

  // Parse timestamps từ ITY format "2025-03-02 15:29:30" → ISO
  function parseItyTime(s: string): string {
    if (!s) return new Date().toISOString();
    try {
      return new Date(s.replace(" ", "T") + "+07:00").toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  const startedAt = parseItyTime(startStamp);
  const endedAt = endStamp ? parseItyTime(endStamp) : new Date(new Date(startedAt).getTime() + duration * 1000).toISOString();

  try {
    await initCallLogSchema();

    // Xây dựng note chi tiết từ các fields ITY
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
      duration: billsec, // Dùng billsec (thời gian đàm thoại thực sự)
      recordingUrl: recordingUrl || undefined,
      provider: "ity",
      startedAt,
      endedAt,
      note,
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
