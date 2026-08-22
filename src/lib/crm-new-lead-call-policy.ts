import { randomUUID } from "crypto";
import { query, queryOne } from "./db";
import type { CallLog, Lead } from "./crm-types";
import {
  DEFAULT_NEW_LEAD_CALL_POLICY,
  type NewLeadCallDashboard,
  type NewLeadCallGate,
  type NewLeadCallPolicy,
  type NewLeadCallReminder,
} from "./crm-new-lead-call-types";

const POLICY_KEY = "default";
const VIETNAM_TZ = "Asia/Ho_Chi_Minh";
let initialized = false;

type SequenceRow = {
  lead_id: string;
  started_at: string;
  unlock_at: string;
  status: "active" | "connected" | "exhausted" | "cancelled";
};

function parseJson<T>(value: T | string): T {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

export function normalizeNewLeadCallPolicy(value?: Partial<NewLeadCallPolicy> | null): NewLeadCallPolicy {
  const callsPerDay = clampInt(value?.callsPerDay, DEFAULT_NEW_LEAD_CALL_POLICY.callsPerDay, 1, 6);
  const intervalHours = clampInt(value?.intervalHours, DEFAULT_NEW_LEAD_CALL_POLICY.intervalHours, 1, 8);
  const latestPossibleStart = Math.max(0, 23 - intervalHours * (callsPerDay - 1));
  const startHour = clampInt(value?.startHour, DEFAULT_NEW_LEAD_CALL_POLICY.startHour, 0, latestPossibleStart);
  const minimumEnd = startHour + intervalHours * (callsPerDay - 1);
  const allowedSuccessStages = new Set(["profile_sent", "surveyed", "quoted", "negotiating", "won", "lost"]);
  return {
    enabled: value?.enabled ?? DEFAULT_NEW_LEAD_CALL_POLICY.enabled,
    startHour,
    endHour: clampInt(value?.endHour, DEFAULT_NEW_LEAD_CALL_POLICY.endHour, minimumEnd, 23),
    callsPerDay,
    intervalHours,
    maxDays: clampInt(value?.maxDays, DEFAULT_NEW_LEAD_CALL_POLICY.maxDays, 1, 14),
    unlockMinAttempts: clampInt(value?.unlockMinAttempts, DEFAULT_NEW_LEAD_CALL_POLICY.unlockMinAttempts, 1, 30),
    unlockMinAttemptsPerDay: clampInt(value?.unlockMinAttemptsPerDay, DEFAULT_NEW_LEAD_CALL_POLICY.unlockMinAttemptsPerDay, 1, callsPerDay),
    popupIntervalMinutes: clampInt(value?.popupIntervalMinutes, DEFAULT_NEW_LEAD_CALL_POLICY.popupIntervalMinutes, 15, 240),
    minAnsweredSeconds: clampInt(value?.minAnsweredSeconds, DEFAULT_NEW_LEAD_CALL_POLICY.minAnsweredSeconds, 0, 60),
    successStage: allowedSuccessStages.has(String(value?.successStage))
      ? value!.successStage!
      : DEFAULT_NEW_LEAD_CALL_POLICY.successStage,
  };
}

function vnParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

export function vietnamDateKey(date: Date) {
  const p = vnParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return vietnamDateKey(date);
}

function vietnamTime(dateKey: string, hour: number) {
  return new Date(`${dateKey}T${String(hour).padStart(2, "0")}:00:00+07:00`);
}

export function buildNewLeadCallSlots(createdAt: string, policyInput?: Partial<NewLeadCallPolicy>) {
  const policy = normalizeNewLeadCallPolicy(policyInput);
  const created = new Date(createdAt);
  const local = vnParts(created);
  let firstDate = vietnamDateKey(created);
  const latestFirstHour = policy.endHour - policy.intervalHours * (policy.callsPerDay - 1);
  let firstHour = Math.max(policy.startHour, local.hour + (local.minute > 0 ? 1 : 0));
  if (firstHour > latestFirstHour) {
    firstDate = addDays(firstDate, 1);
    firstHour = policy.startHour;
  }
  const slots: Array<{ dayNumber: number; slotNumber: number; scheduledAt: string }> = [];
  for (let day = 1; day <= policy.maxDays; day++) {
    const dateKey = addDays(firstDate, day - 1);
    const dayStart = day === 1 ? firstHour : policy.startHour;
    for (let slot = 1; slot <= policy.callsPerDay; slot++) {
      slots.push({
        dayNumber: day,
        slotNumber: slot,
        scheduledAt: vietnamTime(dateKey, dayStart + (slot - 1) * policy.intervalHours).toISOString(),
      });
    }
  }
  return {
    slots,
    unlockAt: vietnamTime(addDays(firstDate, policy.maxDays - 1), policy.endHour).toISOString(),
  };
}

export function evaluateNewLeadCallUnlock(input: {
  attempts: Array<{ dayKey: string; status: string; duration: number }>;
  unlockAt: string;
  now?: Date;
  policy?: Partial<NewLeadCallPolicy>;
}) {
  const policy = normalizeNewLeadCallPolicy(input.policy);
  const success = input.attempts.some(item => item.status === "answered" && item.duration >= policy.minAnsweredSeconds);
  const byDay = new Map<string, number>();
  for (const attempt of input.attempts) byDay.set(attempt.dayKey, (byDay.get(attempt.dayKey) || 0) + 1);
  const qualifiedDays = [...byDay.values()].filter(count => count >= policy.unlockMinAttemptsPerDay).length;
  const elapsed = (input.now ?? new Date()).getTime() >= new Date(input.unlockAt).getTime();
  return {
    success,
    qualifiedDays,
    unlocked: success || (elapsed && input.attempts.length >= policy.unlockMinAttempts && qualifiedDays >= policy.maxDays),
  };
}

async function ensureSchema() {
  if (initialized) return;
  await query(`
    CREATE TABLE IF NOT EXISTS crm_new_lead_call_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS crm_new_lead_call_sequences (
      lead_id TEXT PRIMARY KEY,
      started_at TIMESTAMPTZ NOT NULL,
      unlock_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      connected_call_log_id TEXT,
      connected_at TIMESTAMPTZ,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS crm_new_lead_call_schedules (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      slot_number INTEGER NOT NULL,
      scheduled_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      task_id TEXT,
      call_log_id TEXT,
      assigned_to TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (lead_id, day_number, slot_number)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS crm_new_lead_call_attempts (
      call_log_id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      attempted_at TIMESTAMPTZ NOT NULL,
      day_key DATE NOT NULL,
      status TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      provider TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_new_lead_calls_schedule ON crm_new_lead_call_schedules(scheduled_at, status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_new_lead_calls_attempts ON crm_new_lead_call_attempts(lead_id, attempted_at)`);
  initialized = true;
}

export async function getNewLeadCallPolicy(): Promise<NewLeadCallPolicy> {
  await ensureSchema();
  const row = await queryOne<{ value: NewLeadCallPolicy | string }>(
    `SELECT value FROM crm_new_lead_call_settings WHERE key = $1`, [POLICY_KEY],
  );
  return normalizeNewLeadCallPolicy(row ? parseJson(row.value) : null);
}

export async function saveNewLeadCallPolicy(value: Partial<NewLeadCallPolicy>) {
  await ensureSchema();
  const policy = normalizeNewLeadCallPolicy(value);
  await query(
    `INSERT INTO crm_new_lead_call_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [POLICY_KEY, JSON.stringify(policy)],
  );
  const activeLeads = await query<{ data: Lead | string }>(
    `SELECT l.data FROM crm_leads l JOIN crm_new_lead_call_sequences s ON s.lead_id = l.id
     WHERE l.stage = 'new' AND s.status = 'active' LIMIT 500`,
  ).catch(() => []);
  for (const row of activeLeads) await ensureNewLeadCallSequence(parseJson(row.data));
  return policy;
}

export async function ensureNewLeadCallSequence(lead: Lead) {
  const policy = await getNewLeadCallPolicy();
  if (!policy.enabled || lead.stage !== "new" || !lead.phone) return null;
  const existing = await queryOne<SequenceRow>(`SELECT * FROM crm_new_lead_call_sequences WHERE lead_id = $1`, [lead.id]);
  if (existing && existing.status !== "active") return existing;
  const plan = buildNewLeadCallSlots(lead.createdAt, policy);
  if (!existing) {
    await query(
      `INSERT INTO crm_new_lead_call_sequences (lead_id, started_at, unlock_at, status, data)
       VALUES ($1, $2, $3, 'active', $4) ON CONFLICT (lead_id) DO NOTHING`,
      [lead.id, lead.createdAt, plan.unlockAt, JSON.stringify({ policy })],
    );
  } else if (existing.status === "active") {
    await query(
      `UPDATE crm_new_lead_call_sequences SET unlock_at = $2, data = $3, updated_at = NOW() WHERE lead_id = $1`,
      [lead.id, plan.unlockAt, JSON.stringify({ policy })],
    );
    const cancelled = await query<{ task_id: string | null }>(
      `UPDATE crm_new_lead_call_schedules SET status = 'cancelled', updated_at = NOW()
       WHERE lead_id = $1 AND status = 'pending' AND (day_number > $2 OR slot_number > $3)
       RETURNING task_id`, [lead.id, policy.maxDays, policy.callsPerDay],
    );
    for (const row of cancelled) await setTaskDone(row.task_id);
  }

  for (const slot of plan.slots) {
    const scheduleId = `new-call-${lead.id}-${slot.dayNumber}-${slot.slotNumber}`;
    const taskId = `task-${scheduleId}`;
    const dueDate = vietnamDateKey(new Date(slot.scheduledAt));
    const task = {
      id: taskId,
      leadId: lead.id,
      leadName: lead.name,
      title: `Gọi lại khách mới · lần ${slot.slotNumber}/${policy.callsPerDay} · ngày ${slot.dayNumber}/${policy.maxDays}`,
      dueDate,
      dueAt: slot.scheduledAt,
      priority: "high" as const,
      done: false,
      assignedTo: lead.assignedTo || "",
      createdAt: new Date().toISOString(),
      kind: "new_lead_callback" as const,
      scheduleId,
      sequenceDay: slot.dayNumber,
      sequenceSlot: slot.slotNumber,
    };
    await query(
      `INSERT INTO crm_tasks (id, lead_id, data, due_date, done)
       VALUES ($1, $2, $3, $4, FALSE)
       ON CONFLICT (id) DO UPDATE SET
         data = CASE WHEN crm_tasks.done THEN crm_tasks.data ELSE EXCLUDED.data END,
         due_date = CASE WHEN crm_tasks.done THEN crm_tasks.due_date ELSE EXCLUDED.due_date END,
         updated_at = NOW()`,
      [taskId, lead.id, JSON.stringify(task), dueDate],
    );
    await query(
      `INSERT INTO crm_new_lead_call_schedules
       (id, lead_id, day_number, slot_number, scheduled_at, status, task_id, assigned_to)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
       ON CONFLICT (lead_id, day_number, slot_number) DO UPDATE
       SET scheduled_at = CASE WHEN crm_new_lead_call_schedules.status = 'pending' THEN EXCLUDED.scheduled_at ELSE crm_new_lead_call_schedules.scheduled_at END,
           assigned_to = EXCLUDED.assigned_to,
           updated_at = NOW()`,
      [scheduleId, lead.id, slot.dayNumber, slot.slotNumber, slot.scheduledAt, taskId, lead.assignedTo || ""],
    );
  }
  return queryOne<SequenceRow>(`SELECT * FROM crm_new_lead_call_sequences WHERE lead_id = $1`, [lead.id]);
}

export async function cancelNewLeadCallSequence(leadId: string) {
  await ensureSchema();
  await query(
    `UPDATE crm_new_lead_call_sequences SET status = 'cancelled', updated_at = NOW()
     WHERE lead_id = $1 AND status = 'active'`, [leadId],
  );
  const schedules = await query<{ task_id: string | null }>(
    `UPDATE crm_new_lead_call_schedules SET status = 'cancelled', updated_at = NOW()
     WHERE lead_id = $1 AND status = 'pending' RETURNING task_id`, [leadId],
  );
  for (const row of schedules) await setTaskDone(row.task_id);
}

async function ensureSequencesForNewLeads(assignedTo?: string) {
  const params: unknown[] = [];
  let condition = `stage = 'new'`;
  if (assignedTo) {
    params.push(assignedTo);
    condition += ` AND data->>'assignedTo' = $1`;
  }
  const rows = await query<{ data: Lead | string }>(
    `SELECT data FROM crm_leads WHERE ${condition} ORDER BY updated_at DESC LIMIT 250`, params,
  );
  for (const row of rows) await ensureNewLeadCallSequence(parseJson(row.data));
}

async function setTaskDone(taskId: string | null | undefined) {
  if (!taskId) return;
  const row = await queryOne<{ data: Record<string, unknown> | string }>(`SELECT data FROM crm_tasks WHERE id = $1`, [taskId]);
  if (!row) return;
  const data = { ...parseJson(row.data), done: true };
  await query(`UPDATE crm_tasks SET data = $1, done = TRUE, updated_at = NOW() WHERE id = $2`, [JSON.stringify(data), taskId]);
}

async function completeSuccessfulSequence(leadId: string, callLogId: string, occurredAt: string, policy: NewLeadCallPolicy) {
  await query(
    `UPDATE crm_new_lead_call_sequences SET status = 'connected', connected_call_log_id = $2,
     connected_at = $3, updated_at = NOW() WHERE lead_id = $1`,
    [leadId, callLogId, occurredAt],
  );
  const pending = await query<{ task_id: string | null }>(
    `UPDATE crm_new_lead_call_schedules SET status = 'connected', call_log_id = $2, updated_at = NOW()
     WHERE lead_id = $1 AND status = 'pending' RETURNING task_id`, [leadId, callLogId],
  );
  for (const row of pending) await setTaskDone(row.task_id);

  const { getLead, updateLead, createActivityOnce } = await import("./crm-store");
  const lead = await getLead(leadId);
  if (!lead || lead.stage !== "new") return;
  const updated = await updateLead(lead.id, { stage: policy.successStage, lastContactAt: occurredAt });
  await createActivityOnce(`new-lead-call-success:${callLogId}`, {
    leadId,
    type: "call",
    title: "Tổng đài kết nối thành công",
    content: `Cuộc gọi ITY đã kết nối. CRM tự động chuyển từ Khách hàng mới sang ${policy.successStage === "quoted" ? "Đã báo giá" : policy.successStage}.`,
    createdBy: "CRM · Tổng đài ITY",
    attachments: [],
  }, occurredAt);
  if (updated) {
    const { triggerStageChangeAutomation } = await import("./crm-automation-engine");
    triggerStageChangeAutomation(updated, "new").catch(error => console.error("[new-lead-call] automation error", error));
  }
}

export async function handleItyCallCompleted(call: CallLog) {
  if (call.provider !== "ity" || call.direction !== "outbound" || !call.leadId) return;
  await ensureSchema();
  const { getLead } = await import("./crm-store");
  const lead = await getLead(call.leadId);
  if (!lead) return;
  const sequence = await ensureNewLeadCallSequence(lead);
  if (!sequence) return;
  const policy = await getNewLeadCallPolicy();
  const attemptedAt = call.endedAt || call.startedAt || new Date().toISOString();
  await query(
    `INSERT INTO crm_new_lead_call_attempts
     (call_log_id, lead_id, attempted_at, day_key, status, duration, provider)
     VALUES ($1, $2, $3, $4, $5, $6, 'ity')
     ON CONFLICT (call_log_id) DO UPDATE SET status = EXCLUDED.status, duration = EXCLUDED.duration, attempted_at = EXCLUDED.attempted_at`,
    [call.id, lead.id, attemptedAt, vietnamDateKey(new Date(attemptedAt)), call.status, call.duration || 0],
  );
  const schedule = await queryOne<{ id: string; task_id: string | null }>(
    `SELECT id, task_id FROM crm_new_lead_call_schedules
     WHERE lead_id = $1 AND status = 'pending' ORDER BY scheduled_at ASC LIMIT 1`, [lead.id],
  );
  if (schedule) {
    const connected = call.status === "answered" && (call.duration || 0) >= policy.minAnsweredSeconds;
    await query(
      `UPDATE crm_new_lead_call_schedules SET status = $2, call_log_id = $3, updated_at = NOW() WHERE id = $1`,
      [schedule.id, connected ? "connected" : "attempted", call.id],
    );
    await setTaskDone(schedule.task_id);
  }
  if (call.status === "answered" && (call.duration || 0) >= policy.minAnsweredSeconds) {
    await completeSuccessfulSequence(lead.id, call.id, attemptedAt, policy);
  }
}

async function syncHistoricalItyAttempts(leadId: string) {
  const { initCallLogSchema } = await import("./crm-store");
  await initCallLogSchema();
  const rows = await query<{ id: string; data: CallLog | string; status: string; duration: number; started_at: string; ended_at: string | null }>(
    `SELECT id, data, status, duration, started_at, ended_at FROM crm_call_logs
     WHERE lead_id = $1 AND provider = 'ity' AND direction = 'outbound' AND ended_at IS NOT NULL`, [leadId],
  );
  for (const row of rows) {
    const data = parseJson(row.data);
    const attemptedAt = row.ended_at || data.endedAt || row.started_at;
    await query(
      `INSERT INTO crm_new_lead_call_attempts
       (call_log_id, lead_id, attempted_at, day_key, status, duration, provider)
       VALUES ($1, $2, $3, $4, $5, $6, 'ity') ON CONFLICT (call_log_id) DO NOTHING`,
      [row.id, leadId, attemptedAt, vietnamDateKey(new Date(attemptedAt)), row.status, row.duration || 0],
    );
  }
}

export async function getNewLeadCallGate(lead: Lead): Promise<NewLeadCallGate> {
  const policy = await getNewLeadCallPolicy();
  const open: NewLeadCallGate = {
    enabled: policy.enabled, locked: false, success: false, reason: "", attempts: 0,
    requiredAttempts: policy.unlockMinAttempts, qualifiedDays: 0, requiredDays: policy.maxDays,
    scheduledToday: 0, completedToday: 0, nextCallAt: null, unlockAt: null,
  };
  if (!policy.enabled || lead.stage !== "new") return open;
  const sequence = await ensureNewLeadCallSequence(lead);
  if (!sequence) return open;
  await syncHistoricalItyAttempts(lead.id);
  const attempts = await query<{ day_key: string; status: string; duration: number; call_log_id: string; attempted_at: string }>(
    `SELECT day_key::text, status, duration, call_log_id, attempted_at FROM crm_new_lead_call_attempts
     WHERE lead_id = $1 AND attempted_at >= $2 AND attempted_at <= $3 ORDER BY attempted_at`,
    [lead.id, sequence.started_at, sequence.unlock_at],
  );
  const evaluation = evaluateNewLeadCallUnlock({
    attempts: attempts.map(item => ({ dayKey: item.day_key, status: item.status, duration: item.duration })),
    unlockAt: sequence.unlock_at,
    policy,
  });
  const success = attempts.find(item => item.status === "answered" && item.duration >= policy.minAnsweredSeconds);
  if (success && lead.stage === "new") {
    await completeSuccessfulSequence(lead.id, success.call_log_id, success.attempted_at, policy);
  }
  const today = vietnamDateKey(new Date());
  const todayRows = await query<{ status: string; scheduled_at: string }>(
    `SELECT status, scheduled_at FROM crm_new_lead_call_schedules
     WHERE lead_id = $1 AND (scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $2::date ORDER BY scheduled_at`, [lead.id, today],
  );
  const next = await queryOne<{ scheduled_at: string }>(
    `SELECT scheduled_at FROM crm_new_lead_call_schedules WHERE lead_id = $1 AND status = 'pending' ORDER BY scheduled_at LIMIT 1`, [lead.id],
  );
  const unlocked = evaluation.unlocked;
  const reason = success
    ? "Tổng đài ITY đã ghi nhận cuộc gọi kết nối thành công."
    : unlocked
      ? `Đã đủ ${policy.maxDays} ngày và ${attempts.length} cuộc gọi không thành công.`
      : `Chưa thể chuyển giai đoạn: cần cuộc gọi ITY kết nối thành công, hoặc đủ ${policy.unlockMinAttempts} lần trong ${policy.maxDays} ngày (tối thiểu ${policy.unlockMinAttemptsPerDay} lần/ngày).`;
  return {
    ...open,
    locked: !unlocked,
    success: Boolean(success),
    reason,
    attempts: attempts.length,
    qualifiedDays: evaluation.qualifiedDays,
    scheduledToday: todayRows.length,
    completedToday: todayRows.filter(row => row.status !== "pending").length,
    nextCallAt: next?.scheduled_at ?? null,
    unlockAt: sequence.unlock_at,
  };
}

export async function getNewLeadCallDashboard(assignedTo?: string): Promise<NewLeadCallDashboard> {
  const { initCrmSchema } = await import("./crm-store");
  await initCrmSchema();
  await ensureSchema();
  await ensureSequencesForNewLeads(assignedTo);
  const policy = await getNewLeadCallPolicy();
  const today = vietnamDateKey(new Date());
  const params: unknown[] = [today];
  const staffCondition = assignedTo ? `AND s.assigned_to = $2` : "";
  if (assignedTo) params.push(assignedTo);
  const rows = await query<{
    id: string; lead_id: string; day_number: number; slot_number: number; scheduled_at: string;
    status: NewLeadCallReminder["status"]; assigned_to: string; lead_data: Lead | string;
  }>(
    `SELECT s.id, s.lead_id, s.day_number, s.slot_number, s.scheduled_at, s.status, s.assigned_to, l.data AS lead_data
     FROM crm_new_lead_call_schedules s JOIN crm_leads l ON l.id = s.lead_id
     WHERE l.stage = 'new' AND s.status <> 'cancelled'
       AND (s.scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $1::date ${staffCondition}
     ORDER BY s.scheduled_at`, params,
  );
  const reminders = rows.map(row => {
    const lead = parseJson(row.lead_data);
    return {
      scheduleId: row.id,
      leadId: row.lead_id,
      leadName: lead.name,
      phone: lead.phone,
      assignedTo: row.assigned_to || lead.assignedTo || "",
      scheduledAt: row.scheduled_at,
      dayNumber: row.day_number,
      slotNumber: row.slot_number,
      status: row.status,
    } satisfies NewLeadCallReminder;
  });
  const pending = reminders.filter(item => item.status === "pending");
  const uniqueLeads = new Set(pending.map(item => item.leadId));
  const now = Date.now();
  return {
    customerCount: uniqueLeads.size,
    dueNowCount: new Set(pending.filter(item => new Date(item.scheduledAt).getTime() <= now).map(item => item.leadId)).size,
    overdueCount: pending.filter(item => new Date(item.scheduledAt).getTime() < now).length,
    scheduledCallCount: reminders.length,
    popupIntervalMinutes: policy.popupIntervalMinutes,
    reminders,
  };
}
