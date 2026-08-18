import type { CallLog } from "./crm-types";

const DUPLICATE_WINDOW_MS = 3 * 60 * 1000;

function normalizePhone(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length >= 11) return `0${digits.slice(2)}`;
  return digits;
}

function customerPhone(call: CallLog): string {
  return normalizePhone(call.direction === "outbound" ? call.receiverNumber : call.callerNumber);
}

export function areComplementaryItyCallLogs(left: CallLog, right: CallLog): boolean {
  if (left.id === right.id || left.direction !== right.direction) return false;
  if (left.leadId && right.leadId && left.leadId !== right.leadId) return false;

  const providers = new Set([left.provider, right.provider]);
  if (!providers.has("jssip") || !providers.has("ity")) return false;
  if (!left.recordingUrl && !right.recordingUrl) return false;

  const leftPhone = customerPhone(left);
  const rightPhone = customerPhone(right);
  if (!leftPhone || leftPhone !== rightPhone) return false;

  const timeDifference = Math.abs(new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime());
  return Number.isFinite(timeDifference) && timeDifference <= DUPLICATE_WINDOW_MS;
}

export function mergeComplementaryItyCallLogs(left: CallLog, right: CallLog): CallLog {
  const ityLog = left.provider === "ity" ? left : right;
  const browserLog = left.provider === "jssip" ? left : right;
  const updatedAt = new Date(left.updatedAt).getTime() >= new Date(right.updatedAt).getTime()
    ? left.updatedAt
    : right.updatedAt;

  return {
    ...browserLog,
    ...ityLog,
    id: ityLog.id,
    staffId: browserLog.staffId || ityLog.staffId,
    staffName: browserLog.staffName || ityLog.staffName,
    leadId: browserLog.leadId || ityLog.leadId,
    leadName: browserLog.leadName || ityLog.leadName,
    recordingUrl: ityLog.recordingUrl || browserLog.recordingUrl,
    duration: ityLog.duration > 0 ? ityLog.duration : browserLog.duration,
    note: ityLog.note || browserLog.note,
    updatedAt,
  };
}

/** Hides historical Webphone + ITY webhook pairs that predate server reconciliation. */
export function coalesceComplementaryItyCallLogs(logs: CallLog[]): CallLog[] {
  const result: CallLog[] = [];

  for (const call of logs) {
    const duplicateIndex = result.findIndex(existing => areComplementaryItyCallLogs(existing, call));
    if (duplicateIndex === -1) {
      result.push(call);
      continue;
    }
    result[duplicateIndex] = mergeComplementaryItyCallLogs(result[duplicateIndex], call);
  }

  return result.sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime());
}
