import { query, queryOne } from "@/lib/db";
import { createCallLog, findLeadByIdentity, getCallLog, initCallLogSchema, updateCallLog } from "@/lib/crm-store";
import type { CallLog, CallStatus } from "@/lib/crm-types";

interface HotlineInboundRow {
  id: string;
  call_id: string;
  hotline_number: string | null;
  caller_number: string;
  extension: string | null;
  duration: number;
  billsec: number;
  status: string;
  recording_url: string | null;
  userfield: string | null;
  started_at: string;
}

function callStatus(value: string): CallStatus {
  return value === "answered" || value === "missed" || value === "busy" ? value : "failed";
}

export async function ensureHotlineInboundCallLog(hotlineCallId: string): Promise<CallLog> {
  await initCallLogSchema();
  const hotline = await queryOne<HotlineInboundRow>(
    `SELECT id, call_id, hotline_number, caller_number, extension, duration, billsec,
            status, recording_url, userfield, started_at
     FROM crm_hotline_inbound_calls WHERE id = $1`,
    [hotlineCallId],
  );
  if (!hotline) throw new Error("Không tìm thấy cuộc gọi Hotline Inbound");

  const existingRow = await queryOne<{ id: string }>(
    `SELECT id FROM crm_call_logs WHERE call_id = $1 LIMIT 1`,
    [hotline.call_id],
  );
  const lead = await findLeadByIdentity({ phone: hotline.caller_number }).catch(() => null);
  const duration = Number(hotline.billsec || hotline.duration || 0);
  const startedAt = new Date(hotline.started_at).toISOString();
  const endedAt = new Date(new Date(startedAt).getTime() + Number(hotline.duration || duration) * 1000).toISOString();
  const common = {
    callId: hotline.call_id,
    callerNumber: hotline.caller_number,
    receiverNumber: hotline.hotline_number || hotline.extension || "Hotline",
    direction: "inbound" as const,
    status: callStatus(hotline.status),
    duration,
    recordingUrl: hotline.recording_url || undefined,
    provider: "ity-inbound",
    startedAt,
    endedAt,
    note: hotline.userfield ? `Userfield: ${hotline.userfield}` : undefined,
    leadId: lead?.id,
    leadName: lead?.name,
  };

  if (existingRow) {
    const existing = await getCallLog(existingRow.id);
    const updated = await updateCallLog(existingRow.id, {
      ...common,
      leadId: lead?.id || existing?.leadId,
      leadName: lead?.name || existing?.leadName,
      note: common.note || existing?.note,
    });
    if (!updated) throw new Error("Không thể đồng bộ cuộc gọi Hotline Inbound");
    return updated;
  }

  await createCallLog(common);
  const createdRow = await queryOne<{ id: string }>(
    `SELECT id FROM crm_call_logs WHERE call_id = $1 LIMIT 1`,
    [hotline.call_id],
  );
  const created = createdRow ? await getCallLog(createdRow.id) : null;
  if (!created) throw new Error("Không thể tạo nhật ký cuộc gọi CRM");
  return created;
}

export async function findHotlineCallIdByCallId(callId: string) {
  return queryOne<{ id: string }>(
    `SELECT id FROM crm_hotline_inbound_calls WHERE call_id = $1 LIMIT 1`,
    [callId],
  );
}
