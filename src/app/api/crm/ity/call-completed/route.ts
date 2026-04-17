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
import { query } from "@/lib/db";

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
    if (hangupBy) noteParts.push(`Nắt bởi: ${hangupBy}`);
    if (hangupCause) noteParts.push(`Lý do: ${hangupCause}`);
    if (mos) noteParts.push(`Chất lượng (MOS): ${mos}`);
    if (userfield) noteParts.push(`Userfield: ${userfield}`);
    const note = noteParts.join(" | ") || undefined;

    const receiverPhone = direction === "outbound" ? phone : extension;
    const callerNum = direction === "outbound" ? extension : phone;

    // --- Gộp với bản ghi JsSIP đã lưu trước đó ---
    // Tìm bản ghi có cùng số điện thoại + thời gian gần nhau (±5 phút) + chưa có recording_url
    const normalizePhone = (p: string) => p.replace(/\D/g, "").replace(/^84/, "0");
    const normalizedReceiver = normalizePhone(receiverPhone);
    const plus84Receiver = normalizedReceiver.startsWith("0") ? "+84" + normalizedReceiver.slice(1) : normalizedReceiver;
    const startedAtDate = new Date(startedAt);
    // Nới rộng window ±10 phút để xử lý lệch múi giờ hoặc delay webhook
    const windowStart = new Date(startedAtDate.getTime() - 10 * 60 * 1000).toISOString();
    const windowEnd = new Date(startedAtDate.getTime() + 10 * 60 * 1000).toISOString();

    const existingRows = await query<{ id: string; data: string }>(
      `SELECT id, data FROM crm_call_logs
       WHERE (receiver_number = $1 OR receiver_number = $2
           OR caller_number = $1 OR caller_number = $2)
         AND started_at BETWEEN $3 AND $4
         AND provider = 'jssip'
       ORDER BY started_at DESC
       LIMIT 1`,
      [normalizedReceiver, plus84Receiver, windowStart, windowEnd]
    );

    if (existingRows.length > 0) {
      // Gộp: UPDATE bản ghi JsSIP với thông tin từ webhook ITY
      const existingId = existingRows[0].id;
      const existingData = typeof existingRows[0].data === "string"
        ? JSON.parse(existingRows[0].data)
        : existingRows[0].data;
      const mergedData = {
        ...existingData,
        callId: callid, // Cập nhật sang callId của ITY
        recordingUrl: recordingUrl || existingData.recordingUrl,
        duration: billsec > 0 ? billsec : (existingData.duration ?? 0),
        status: mapItyStatus(ityStatus),
        note: note || existingData.note,
        provider: "ity",
        endedAt,
        updatedAt: new Date().toISOString(),
      };
      await query(
        `UPDATE crm_call_logs
         SET call_id = $1, recording_url = $2, duration = $3, status = $4, note = $5,
             provider = 'ity', ended_at = $6, data = $7, updated_at = NOW()
         WHERE id = $8`,
        [callid, recordingUrl || null, mergedData.duration, mergedData.status,
         mergedData.note ?? null, endedAt, JSON.stringify(mergedData), existingId]
      );
      console.log(`[ITY call-completed] MERGED into existing JsSIP record ${existingId}, CallID: ${callid}`);
      return NextResponse.json({ status: "ok", id: existingId, callId: callid, merged: true });
    }

    // Không tìm thấy bản ghi JsSIP → tạo mới bình thường
    const callLog = await createCallLog({
      callId: callid,
      callerNumber: callerNum,
      receiverNumber: receiverPhone,
      direction,
      status: mapItyStatus(ityStatus),
      duration: billsec,
      recordingUrl: recordingUrl || undefined,
      provider: "ity",
      startedAt,
      endedAt,
      note,
    });

    console.log(`[ITY call-completed] NEW record, CallID: ${callid}, Status: ${ityStatus}, Duration: ${billsec}s, Recording: ${recordingUrl || "none"}`);

    return NextResponse.json({
      status: "ok",
      id: callLog.id,
      callId: callid,
      leadId: callLog.leadId,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    console.error("[ITY call-completed] Error:", errMsg, errStack);
    return NextResponse.json({ error: "Internal error", detail: errMsg }, { status: 500 });
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
