/**
 * Hotline Inbound Webhook — Nhận cuộc gọi đến từ 4 số hotline ITY
 * POST /api/crm/hotline-inbound/webhook
 *
 * ITY gửi form data khi cuộc gọi kết thúc:
 * {
 *   "callid": "1775969360.108000213",
 *   "calldate": "2026-04-12 11:49:20",
 *   "extension": "89866101",
 *   "phone": "0977433926",
 *   "duration": "32",
 *   "billsec": "0",
 *   "status": "NO ANSWER",
 *   "recording": "https://cc16.ity.vn/records/?action=record&id=...",
 *   "userfield": "",
 *   "direction": "incoming"
 * }
 *
 * Webhook URL cấu hình trong ITY:
 * https://smartfurni-webapp-production.up.railway.app/api/crm/hotline-inbound/webhook
 * (Không cần secret — ITY inbound không hỗ trợ header auth)
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

// Map trạng thái ITY → chuẩn hóa
function mapStatus(s: string): "answered" | "missed" | "busy" | "failed" {
  const upper = (s || "").toUpperCase().trim();
  if (upper === "ANSWERED") return "answered";
  if (upper === "NO ANSWER" || upper === "NO_ANSWER" || upper === "NOANSWER") return "missed";
  if (upper === "BUSY") return "busy";
  return "failed";
}

// Parse thời gian ITY "2026-04-12 11:49:20" → ISO (UTC+7)
function parseItyTime(s: string): string {
  if (!s) return new Date().toISOString();
  try {
    return new Date(s.replace(" ", "T") + "+07:00").toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// Khởi tạo bảng hotline_inbound_calls nếu chưa có
async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_hotline_inbound_calls (
      id TEXT PRIMARY KEY,
      call_id TEXT UNIQUE,
      hotline_number TEXT,
      caller_number TEXT NOT NULL,
      extension TEXT,
      duration INTEGER DEFAULT 0,
      billsec INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'missed',
      recording_url TEXT,
      userfield TEXT,
      direction TEXT DEFAULT 'inbound',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      raw_payload JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  try {
    await query(`CREATE INDEX IF NOT EXISTS idx_hotline_inbound_started ON crm_hotline_inbound_calls(started_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_hotline_inbound_caller ON crm_hotline_inbound_calls(caller_number)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_hotline_inbound_hotline ON crm_hotline_inbound_calls(hotline_number)`);
  } catch { /* ok */ }
}

let schemaReady = false;

export async function POST(req: NextRequest) {
  let body: Record<string, string> = {};

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await req.json();
      // Convert all values to string for consistency
      Object.entries(json).forEach(([k, v]) => { body[k] = String(v ?? ""); });
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      formData.forEach((v, k) => { body[k] = String(v); });
    } else {
      // Thử parse text như form-urlencoded
      const text = await req.text();
      if (text.startsWith("{")) {
        const json = JSON.parse(text);
        Object.entries(json).forEach(([k, v]) => { body[k] = String(v ?? ""); });
      } else {
        text.split("&").forEach(pair => {
          const [k, v] = pair.split("=");
          if (k) body[decodeURIComponent(k)] = decodeURIComponent(v || "");
        });
      }
    }
  } catch (e) {
    console.error("[hotline-inbound webhook] Parse error:", e);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Extract fields từ ITY payload
  const callId = body.callid || body.call_id || `ity_inbound_${Date.now()}`;
  const callerNumber = body.phone || body.caller || "";
  const extension = body.extension || "";
  const duration = parseInt(body.duration || "0", 10);
  const billsec = parseInt(body.billsec || "0", 10);
  const status = mapStatus(body.status || "NO ANSWER");
  const recordingUrl = body.recording || body.recording_url || "";
  const userfield = body.userfield || "";
  const direction = body.direction || "incoming";
  const startedAt = parseItyTime(body.calldate || body.call_date || "");

  // hotline_number: ITY inbound thường gửi qua extension hoặc userfield
  // Nếu có nhiều hotline, ITY có thể gửi qua userfield hoặc extension prefix
  const hotlineNumber = body.hotline || body.hotline_number || extension || "";

  if (!callerNumber) {
    console.warn("[hotline-inbound webhook] Missing caller number, body:", body);
    return NextResponse.json({ error: "Missing phone number" }, { status: 400 });
  }

  try {
    if (!schemaReady) {
      await initSchema();
      schemaReady = true;
    }

    const id = nanoid();

    await query(
      `INSERT INTO crm_hotline_inbound_calls
        (id, call_id, hotline_number, caller_number, extension, duration, billsec, status, recording_url, userfield, direction, started_at, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (call_id) DO UPDATE SET
         status = EXCLUDED.status,
         duration = EXCLUDED.duration,
         billsec = EXCLUDED.billsec,
         recording_url = COALESCE(EXCLUDED.recording_url, crm_hotline_inbound_calls.recording_url),
         raw_payload = EXCLUDED.raw_payload`,
      [id, callId, hotlineNumber, callerNumber, extension, duration, billsec,
       status, recordingUrl || null, userfield || null, direction, startedAt,
       JSON.stringify(body)]
    );

    console.log(`[hotline-inbound] Saved: ${callerNumber} → ${hotlineNumber}, status=${status}, duration=${duration}s`);
    return NextResponse.json({ ok: true, id, callId, status });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[hotline-inbound webhook] DB error:", msg);
    return NextResponse.json({ error: "Internal error", detail: msg }, { status: 500 });
  }
}

// GET — Kiểm tra endpoint hoạt động
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/crm/hotline-inbound/webhook",
    description: "Nhận webhook cuộc gọi đến từ ITY Inbound (4 số hotline)",
    webhookUrl: "https://smartfurni-webapp-production.up.railway.app/api/crm/hotline-inbound/webhook",
    expectedFields: {
      callid: "ID cuộc gọi",
      calldate: "Thời gian (YYYY-MM-DD HH:mm:ss)",
      extension: "Số máy lẻ / hotline extension",
      phone: "Số điện thoại người gọi",
      duration: "Tổng thời gian (giây)",
      billsec: "Thời gian đàm thoại (giây)",
      status: "ANSWERED | NO ANSWER | BUSY",
      recording: "URL file ghi âm",
      userfield: "Trường tùy chỉnh",
      direction: "incoming | outbound",
    },
  });
}
