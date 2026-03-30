/**
 * Webhook endpoint nhận dữ liệu cuộc gọi từ tổng đài ảo
 * Hỗ trợ: Stringee, Zalo Cloud, VNPT, Viettel, và các tổng đài chuẩn
 *
 * POST /api/crm/call-logs/webhook
 * Header: x-webhook-secret: <CALL_WEBHOOK_SECRET>
 *
 * Body (chuẩn hóa):
 * {
 *   call_id: string,
 *   caller_number: string,
 *   receiver_number: string,
 *   duration: number,        // giây
 *   status: "answered" | "missed" | "busy" | "failed",
 *   direction: "inbound" | "outbound",
 *   recording_url?: string,
 *   staff_id?: string,
 *   staff_name?: string,
 *   started_at?: string,     // ISO datetime
 *   ended_at?: string,
 *   provider?: string,       // "stringee" | "zalo" | "vnpt" | ...
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createCallLog } from "@/lib/crm-store";

export const dynamic = "force-dynamic";

// Normalize payload từ các provider khác nhau
function normalizePayload(body: Record<string, unknown>, provider: string) {
  // Stringee format
  if (provider === "stringee" || body.stringee_call_id) {
    return {
      callId: (body.stringee_call_id ?? body.call_id ?? `str_${Date.now()}`) as string,
      callerNumber: (body.from_number ?? body.caller_number ?? "") as string,
      receiverNumber: (body.to_number ?? body.receiver_number ?? "") as string,
      direction: ((body.call_type === "callout" ? "outbound" : "inbound") as "outbound" | "inbound"),
      status: (body.answered_duration ? "answered" : "missed") as "answered" | "missed" | "busy" | "failed",
      duration: Number(body.answered_duration ?? body.duration ?? 0),
      recordingUrl: body.record_url as string | undefined,
      staffId: body.staff_id as string | undefined,
      staffName: body.staff_name as string | undefined,
      startedAt: (body.started_at ?? new Date().toISOString()) as string,
      endedAt: body.ended_at as string | undefined,
      provider: "stringee",
    };
  }

  // Zalo Cloud format
  if (provider === "zalo" || body.zalo_call_id) {
    return {
      callId: (body.zalo_call_id ?? body.call_id ?? `zalo_${Date.now()}`) as string,
      callerNumber: (body.caller ?? body.caller_number ?? "") as string,
      receiverNumber: (body.callee ?? body.receiver_number ?? "") as string,
      direction: (body.direction ?? "outbound") as "outbound" | "inbound",
      status: (body.status ?? "answered") as "answered" | "missed" | "busy" | "failed",
      duration: Number(body.duration ?? 0),
      recordingUrl: body.recording_url as string | undefined,
      staffId: body.agent_id as string | undefined,
      staffName: body.agent_name as string | undefined,
      startedAt: (body.start_time ?? new Date().toISOString()) as string,
      endedAt: body.end_time as string | undefined,
      provider: "zalo",
    };
  }

  // Generic / chuẩn hóa chung
  return {
    callId: (body.call_id ?? `webhook_${Date.now()}`) as string,
    callerNumber: (body.caller_number ?? body.from ?? "") as string,
    receiverNumber: (body.receiver_number ?? body.to ?? "") as string,
    direction: (body.direction ?? "outbound") as "outbound" | "inbound",
    status: (body.status ?? "answered") as "answered" | "missed" | "busy" | "failed",
    duration: Number(body.duration ?? 0),
    recordingUrl: (body.recording_url ?? body.record_url) as string | undefined,
    staffId: (body.staff_id ?? body.agent_id) as string | undefined,
    staffName: (body.staff_name ?? body.agent_name) as string | undefined,
    startedAt: (body.started_at ?? body.start_time ?? new Date().toISOString()) as string,
    endedAt: (body.ended_at ?? body.end_time) as string | undefined,
    provider: (provider || "webhook") as string,
  };
}

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = process.env.CALL_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = req.headers.get("x-webhook-secret") ?? req.headers.get("x-api-key");
    if (headerSecret !== secret) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const provider = (req.headers.get("x-provider") ?? body.provider ?? "webhook") as string;

  try {
    const normalized = normalizePayload(body, provider);
    const log = await createCallLog(normalized);
    return NextResponse.json({ success: true, id: log.id, leadId: log.leadId }, { status: 201 });
  } catch (err) {
    console.error("[call-webhook] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — Kiểm tra webhook hoạt động
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/crm/call-logs/webhook",
    supportedProviders: ["stringee", "zalo", "vnpt", "viettel", "generic"],
    requiredFields: ["call_id", "caller_number", "receiver_number", "duration"],
    optionalFields: ["status", "direction", "recording_url", "staff_id", "started_at"],
  });
}
