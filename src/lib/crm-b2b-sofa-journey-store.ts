import "server-only";

import { randomUUID } from "crypto";
import { getDb, query, queryOne } from "@/lib/db";
import { getLeads, getLead } from "@/lib/crm-store";
import type { Lead } from "@/lib/crm-types";
import {
  B2B_SOFA_JOURNEY,
  B2B_SOFA_JOURNEY_CODE,
  DEFAULT_B2B_SOFA_JOURNEY_SETTINGS,
  buildJourneyContext,
  isEligibleForB2BSofaJourney,
  scheduleJourneyStep,
  type B2BSofaJourneySettings,
  type JourneyChannel,
} from "@/lib/crm-b2b-sofa-journey";

export type JourneyEnrollmentStatus = "active" | "paused" | "completed" | "cancelled";
export type JourneyActionStatus =
  | "pending"
  | "sending"
  | "waiting_content"
  | "sent"
  | "failed"
  | "delivery_unknown"
  | "skipped"
  | "cancelled";

export interface JourneyChannelAttempt {
  channel: JourneyChannel | "system";
  at: string;
  outcome: "sent" | "definitive_failure" | "delivery_unknown" | "blocked";
  error?: string;
  providerMessageId?: string;
}

export interface JourneyEnrollmentRecord {
  id: string;
  journeyCode: string;
  journeyVersion: number;
  leadId: string;
  status: JourneyEnrollmentStatus;
  automationAccountId: string;
  context: Record<string, string>;
  enrolledAt: string;
  baselineContactAt: string;
  lastOutboundAt: string | null;
  pausedReason: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface JourneyActionRecord {
  id: string;
  enrollmentId: string;
  leadId: string;
  stepId: string;
  dayOffset: number;
  scheduledAt: string;
  nextAttemptAt: string | null;
  status: JourneyActionStatus;
  primaryChannel: JourneyChannel;
  fallbackChannels: JourneyChannel[];
  sentChannel: JourneyChannel | null;
  attempts: JourneyChannelAttempt[];
  contentVersion: number;
  claimedAt: string | null;
  error: string;
  sentAt: string | null;
  updatedAt: string;
}

interface EnrollmentRow {
  id: string;
  journey_code: string;
  journey_version: number;
  lead_id: string;
  status: JourneyEnrollmentStatus;
  automation_account_id: string;
  context: Record<string, string> | string;
  enrolled_at: string;
  baseline_contact_at: string;
  last_outbound_at: string | null;
  paused_reason: string;
  completed_at: string | null;
  updated_at: string;
}

interface ActionRow {
  id: string;
  enrollment_id: string;
  lead_id: string;
  step_id: string;
  day_offset: number;
  scheduled_at: string;
  next_attempt_at: string | null;
  status: JourneyActionStatus;
  primary_channel: JourneyChannel;
  fallback_channels: JourneyChannel[] | string;
  sent_channel: JourneyChannel | null;
  attempts: JourneyChannelAttempt[] | string;
  content_version: number;
  claimed_at: string | null;
  error: string;
  sent_at: string | null;
  updated_at: string;
}

let schemaPromise: Promise<void> | null = null;

function jsonValue<T>(value: T | string, fallback: T): T {
  if (typeof value !== "string") return value ?? fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function mapEnrollment(row: EnrollmentRow): JourneyEnrollmentRecord {
  return {
    id: row.id,
    journeyCode: row.journey_code,
    journeyVersion: Number(row.journey_version),
    leadId: row.lead_id,
    status: row.status,
    automationAccountId: row.automation_account_id || "",
    context: jsonValue(row.context, {}),
    enrolledAt: String(row.enrolled_at),
    baselineContactAt: String(row.baseline_contact_at),
    lastOutboundAt: row.last_outbound_at ? String(row.last_outbound_at) : null,
    pausedReason: row.paused_reason || "",
    completedAt: row.completed_at ? String(row.completed_at) : null,
    updatedAt: String(row.updated_at),
  };
}

function mapAction(row: ActionRow): JourneyActionRecord {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    leadId: row.lead_id,
    stepId: row.step_id,
    dayOffset: Number(row.day_offset),
    scheduledAt: String(row.scheduled_at),
    nextAttemptAt: row.next_attempt_at ? String(row.next_attempt_at) : null,
    status: row.status,
    primaryChannel: row.primary_channel,
    fallbackChannels: jsonValue(row.fallback_channels, []),
    sentChannel: row.sent_channel || null,
    attempts: jsonValue(row.attempts, []),
    contentVersion: Number(row.content_version),
    claimedAt: row.claimed_at ? String(row.claimed_at) : null,
    error: row.error || "",
    sentAt: row.sent_at ? String(row.sent_at) : null,
    updatedAt: String(row.updated_at),
  };
}

async function createSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_journey_settings (
      journey_code TEXT PRIMARY KEY,
      settings JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_journey_enrollments (
      id TEXT PRIMARY KEY,
      journey_code TEXT NOT NULL,
      journey_version INTEGER NOT NULL,
      lead_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      automation_account_id TEXT NOT NULL DEFAULT '',
      context JSONB NOT NULL DEFAULT '{}',
      enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      baseline_contact_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_outbound_at TIMESTAMPTZ,
      paused_reason TEXT NOT NULL DEFAULT '',
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (journey_code, lead_id)
    );

    CREATE TABLE IF NOT EXISTS crm_journey_actions (
      id TEXT PRIMARY KEY,
      enrollment_id TEXT NOT NULL REFERENCES crm_journey_enrollments(id) ON DELETE CASCADE,
      lead_id TEXT NOT NULL,
      step_id TEXT NOT NULL,
      day_offset INTEGER NOT NULL,
      scheduled_at TIMESTAMPTZ NOT NULL,
      next_attempt_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'pending',
      primary_channel TEXT NOT NULL,
      fallback_channels JSONB NOT NULL DEFAULT '[]',
      sent_channel TEXT,
      attempts JSONB NOT NULL DEFAULT '[]',
      content_version INTEGER NOT NULL DEFAULT 1,
      claimed_at TIMESTAMPTZ,
      error TEXT NOT NULL DEFAULT '',
      sent_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (enrollment_id, step_id)
    );

    CREATE INDEX IF NOT EXISTS idx_crm_journey_actions_due
      ON crm_journey_actions(status, COALESCE(next_attempt_at, scheduled_at));
    CREATE INDEX IF NOT EXISTS idx_crm_journey_actions_lead
      ON crm_journey_actions(lead_id, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_crm_journey_enrollments_status
      ON crm_journey_enrollments(journey_code, status, enrolled_at);
  `);
}

export async function initB2BSofaJourneySchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = createSchema().catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export async function getB2BSofaJourneySettings(): Promise<B2BSofaJourneySettings> {
  await initB2BSofaJourneySchema();
  const row = await queryOne<{ settings: Partial<B2BSofaJourneySettings> | string }>(
    `SELECT settings FROM crm_journey_settings WHERE journey_code=$1`,
    [B2B_SOFA_JOURNEY_CODE],
  );
  const stored = row ? jsonValue(row.settings, {}) : {};
  return { ...DEFAULT_B2B_SOFA_JOURNEY_SETTINGS, ...stored };
}

export async function saveB2BSofaJourneySettings(
  input: Partial<B2BSofaJourneySettings>,
): Promise<B2BSofaJourneySettings> {
  await initB2BSofaJourneySchema();
  const current = await getB2BSofaJourneySettings();
  const enablingNow = !current.enabled && input.enabled === true;
  const settings: B2BSofaJourneySettings = {
    ...current,
    ...input,
    timezone: "Asia/Ho_Chi_Minh",
    activationAt: enablingNow ? new Date().toISOString() : (input.activationAt ?? current.activationAt),
    maxMessagesPerSevenDays: Math.max(1, Math.min(7, Number(input.maxMessagesPerSevenDays ?? current.maxMessagesPerSevenDays))),
  };
  await query(
    `INSERT INTO crm_journey_settings (journey_code,settings,updated_at)
     VALUES ($1,$2::jsonb,NOW())
     ON CONFLICT (journey_code) DO UPDATE SET settings=EXCLUDED.settings,updated_at=NOW()`,
    [B2B_SOFA_JOURNEY_CODE, JSON.stringify(settings)],
  );
  return settings;
}

export async function getJourneyEnrollment(leadId: string): Promise<JourneyEnrollmentRecord | null> {
  await initB2BSofaJourneySchema();
  const row = await queryOne<EnrollmentRow>(
    `SELECT * FROM crm_journey_enrollments WHERE journey_code=$1 AND lead_id=$2`,
    [B2B_SOFA_JOURNEY_CODE, leadId],
  );
  return row ? mapEnrollment(row) : null;
}

export async function enrollLeadInB2BSofaJourney(
  lead: Lead,
  settings: B2BSofaJourneySettings,
  input?: { context?: Record<string, string>; automationAccountId?: string; force?: boolean },
): Promise<{ enrollment: JourneyEnrollmentRecord; created: boolean }> {
  await initB2BSofaJourneySchema();
  const eligibility = isEligibleForB2BSofaJourney(lead, settings);
  if (!eligibility.eligible && !input?.force) throw new Error(eligibility.reason || "Lead không đủ điều kiện.");

  const existing = await getJourneyEnrollment(lead.id);
  if (existing) return { enrollment: existing, created: false };

  const id = `jen-${randomUUID()}`;
  const enrolledAt = new Date();
  const context = buildJourneyContext(lead, settings, input?.context || {});
  const accountId = input?.automationAccountId || settings.automationAccountId || "";
  const baseline = lead.lastContactAt || lead.createdAt || enrolledAt.toISOString();

  const db = getDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<EnrollmentRow>(
      `INSERT INTO crm_journey_enrollments
        (id,journey_code,journey_version,lead_id,status,automation_account_id,context,enrolled_at,baseline_contact_at)
       VALUES ($1,$2,$3,$4,'active',$5,$6::jsonb,$7,$8)
       ON CONFLICT (journey_code,lead_id) DO NOTHING
       RETURNING *`,
      [id, B2B_SOFA_JOURNEY_CODE, B2B_SOFA_JOURNEY.version, lead.id, accountId, JSON.stringify(context), enrolledAt.toISOString(), baseline],
    );
    if (!inserted.rows[0]) {
      await client.query("ROLLBACK");
      const raced = await getJourneyEnrollment(lead.id);
      if (!raced) throw new Error("Không thể tạo journey cho lead.");
      return { enrollment: raced, created: false };
    }
    for (const step of B2B_SOFA_JOURNEY.steps) {
      await client.query(
        `INSERT INTO crm_journey_actions
          (id,enrollment_id,lead_id,step_id,day_offset,scheduled_at,status,primary_channel,fallback_channels,content_version)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8::jsonb,$9)
         ON CONFLICT (enrollment_id,step_id) DO NOTHING`,
        [
          `jac-${randomUUID()}`, id, lead.id, step.id, step.day,
          scheduleJourneyStep(enrolledAt, step).toISOString(), step.primaryChannel,
          JSON.stringify(step.fallbackChannels), B2B_SOFA_JOURNEY.version,
        ],
      );
    }
    await client.query("COMMIT");
    return { enrollment: mapEnrollment(inserted.rows[0]), created: true };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function autoEnrollEligibleB2BSofaLeads(
  settings: B2BSofaJourneySettings,
): Promise<{ checked: number; enrolled: number; skipped: number }> {
  if (!settings.enabled || !settings.autoEnroll) return { checked: 0, enrolled: 0, skipped: 0 };
  const leads = await getLeads();
  let enrolled = 0;
  let skipped = 0;
  const activationAt = settings.activationAt ? new Date(settings.activationAt).getTime() : Date.now();
  for (const lead of leads) {
    if (!settings.autoEnrollExisting && new Date(lead.createdAt).getTime() < activationAt) {
      skipped += 1;
      continue;
    }
    const eligible = isEligibleForB2BSofaJourney(lead, settings);
    if (!eligible.eligible) {
      skipped += 1;
      continue;
    }
    const result = await enrollLeadInB2BSofaJourney(lead, settings).catch(() => null);
    if (result?.created) enrolled += 1;
  }
  return { checked: leads.length, enrolled, skipped };
}

export async function claimDueJourneyActions(limit = 20): Promise<JourneyActionRecord[]> {
  await initB2BSofaJourneySchema();
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    // Không tự gửi lại một job đã mất kết nối sau khi bắt đầu gửi; cần đối soát thủ công.
    await client.query(
      `UPDATE crm_journey_actions
       SET status='delivery_unknown',error='Worker mất kết nối sau khi claim; cần đối soát trước khi gửi lại.',updated_at=NOW()
       WHERE status='sending' AND claimed_at < NOW()-INTERVAL '15 minutes'`,
    );
    const rows = await client.query<ActionRow>(
      `SELECT a.*
       FROM crm_journey_actions a
       JOIN crm_journey_enrollments e ON e.id=a.enrollment_id
       WHERE e.status='active'
         AND a.status IN ('pending','waiting_content')
         AND COALESCE(a.next_attempt_at,a.scheduled_at)<=NOW()
       ORDER BY COALESCE(a.next_attempt_at,a.scheduled_at),a.day_offset
       FOR UPDATE OF a SKIP LOCKED
       LIMIT $1`,
      [Math.max(1, Math.min(100, Math.trunc(limit)))],
    );
    const ids = rows.rows.map(row => row.id);
    if (ids.length) {
      await client.query(
        `UPDATE crm_journey_actions SET status='sending',claimed_at=NOW(),updated_at=NOW() WHERE id=ANY($1::text[])`,
        [ids],
      );
    }
    await client.query("COMMIT");
    return rows.rows.map(row => mapAction({ ...row, status: "sending", claimed_at: new Date().toISOString() }));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function getEnrollmentById(id: string): Promise<JourneyEnrollmentRecord | null> {
  await initB2BSofaJourneySchema();
  const row = await queryOne<EnrollmentRow>(`SELECT * FROM crm_journey_enrollments WHERE id=$1`, [id]);
  return row ? mapEnrollment(row) : null;
}

export async function updateJourneyContext(
  enrollmentId: string,
  patch: Record<string, string>,
): Promise<JourneyEnrollmentRecord | null> {
  await initB2BSofaJourneySchema();
  const current = await getEnrollmentById(enrollmentId);
  if (!current) return null;
  const context = { ...current.context, ...patch };
  const row = await queryOne<EnrollmentRow>(
    `UPDATE crm_journey_enrollments SET context=$2::jsonb,updated_at=NOW() WHERE id=$1 RETURNING *`,
    [enrollmentId, JSON.stringify(context)],
  );
  if (row) {
    await query(
      `UPDATE crm_journey_actions SET status='pending',next_attempt_at=NOW(),error='',claimed_at=NULL,updated_at=NOW()
       WHERE enrollment_id=$1 AND status='waiting_content'`,
      [enrollmentId],
    );
  }
  return row ? mapEnrollment(row) : null;
}

export async function pauseJourneyEnrollment(id: string, reason: string): Promise<void> {
  await initB2BSofaJourneySchema();
  await query(
    `UPDATE crm_journey_enrollments SET status='paused',paused_reason=$2,updated_at=NOW()
     WHERE id=$1 AND status='active'`,
    [id, reason.slice(0, 1000)],
  );
}

export async function resumeJourneyEnrollment(id: string): Promise<void> {
  await initB2BSofaJourneySchema();
  await query(
    `UPDATE crm_journey_enrollments SET status='active',paused_reason='',baseline_contact_at=NOW(),updated_at=NOW()
     WHERE id=$1 AND status='paused'`,
    [id],
  );
}

export async function cancelJourneyEnrollment(id: string, reason: string): Promise<void> {
  await initB2BSofaJourneySchema();
  await query(
    `UPDATE crm_journey_enrollments SET status='cancelled',paused_reason=$2,completed_at=NOW(),updated_at=NOW()
     WHERE id=$1 AND status IN ('active','paused');
    `,
    [id, reason.slice(0, 1000)],
  );
  await query(
    `UPDATE crm_journey_actions SET status='cancelled',error=$2,claimed_at=NULL,updated_at=NOW()
     WHERE enrollment_id=$1 AND status IN ('pending','waiting_content','sending')`,
    [id, reason.slice(0, 1000)],
  );
}

export async function markJourneyActionWaitingContent(
  action: JourneyActionRecord,
  missing: string[],
): Promise<void> {
  const attempt: JourneyChannelAttempt = {
    channel: "system",
    at: new Date().toISOString(),
    outcome: "blocked",
    error: `Thiếu dữ liệu: ${missing.join(", ")}`,
  };
  const attempts = [...action.attempts, attempt];
  const contentBlocks = attempts.filter(item => item.channel === "system" && item.outcome === "blocked").length;
  const exhausted = contentBlocks >= 7;
  await query(
    `UPDATE crm_journey_actions
     SET status=$2,next_attempt_at=CASE WHEN $2='waiting_content' THEN NOW()+INTERVAL '1 day' ELSE NULL END,
       attempts=$3::jsonb,error=$4,claimed_at=NULL,updated_at=NOW()
     WHERE id=$1`,
    [
      action.id,
      exhausted ? "skipped" : "waiting_content",
      JSON.stringify(attempts),
      exhausted ? `Bỏ qua sau 7 lần chờ dữ liệu: ${missing.join(", ")}` : `Chờ bổ sung dữ liệu: ${missing.join(", ")}`,
    ],
  );
  if (exhausted) await completeJourneyIfFinished(action.enrollmentId);
}

export async function markJourneyActionSent(
  action: JourneyActionRecord,
  channel: JourneyChannel,
  attempts: JourneyChannelAttempt[],
): Promise<void> {
  await query(
    `UPDATE crm_journey_actions
     SET status='sent',sent_channel=$2,attempts=$3::jsonb,sent_at=NOW(),claimed_at=NULL,error='',updated_at=NOW()
     WHERE id=$1 AND status='sending'`,
    [action.id, channel, JSON.stringify(attempts)],
  );
  await query(
    `UPDATE crm_journey_enrollments SET last_outbound_at=NOW(),updated_at=NOW() WHERE id=$1`,
    [action.enrollmentId],
  );
  await completeJourneyIfFinished(action.enrollmentId);
}

export async function markJourneyActionOutcome(
  action: JourneyActionRecord,
  status: "failed" | "delivery_unknown" | "skipped",
  attempts: JourneyChannelAttempt[],
  error: string,
): Promise<void> {
  await query(
    `UPDATE crm_journey_actions
     SET status=$2,attempts=$3::jsonb,error=$4,claimed_at=NULL,next_attempt_at=NULL,updated_at=NOW()
     WHERE id=$1 AND status='sending'`,
    [action.id, status, JSON.stringify(attempts), error.slice(0, 2000)],
  );
  await completeJourneyIfFinished(action.enrollmentId);
}

async function completeJourneyIfFinished(enrollmentId: string): Promise<void> {
  await query(
    `UPDATE crm_journey_enrollments e
     SET status='completed',completed_at=NOW(),updated_at=NOW()
     WHERE e.id=$1 AND e.status='active'
       AND NOT EXISTS (
         SELECT 1 FROM crm_journey_actions a
         WHERE a.enrollment_id=e.id AND a.status IN ('pending','sending','waiting_content')
       )`,
    [enrollmentId],
  );
}

export async function getLeadForJourneyAction(action: JourneyActionRecord): Promise<Lead | null> {
  return getLead(action.leadId);
}

export async function countJourneyMessagesInLastSevenDays(leadId: string): Promise<number> {
  await initB2BSofaJourneySchema();
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM crm_journey_actions
     WHERE lead_id=$1 AND status='sent' AND sent_at>=NOW()-INTERVAL '7 days'`,
    [leadId],
  );
  return Number(row?.count || 0);
}

export async function deferJourneyAction(actionId: string, until: Date, reason: string): Promise<void> {
  await query(
    `UPDATE crm_journey_actions SET status='pending',next_attempt_at=$2,claimed_at=NULL,error=$3,updated_at=NOW() WHERE id=$1`,
    [actionId, until.toISOString(), reason.slice(0, 1000)],
  );
}

export async function getB2BSofaJourneyDashboard(): Promise<{
  settings: B2BSofaJourneySettings;
  stats: Record<string, number>;
  recentEnrollments: Array<JourneyEnrollmentRecord & { leadName: string }>;
  recentActions: JourneyActionRecord[];
}> {
  await initB2BSofaJourneySchema();
  const settings = await getB2BSofaJourneySettings();
  const [statRow, enrollmentRows, actionRows] = await Promise.all([
    queryOne<Record<string, number>>(
      `SELECT
        COUNT(*) FILTER (WHERE status='active')::int AS active,
        COUNT(*) FILTER (WHERE status='paused')::int AS paused,
        COUNT(*) FILTER (WHERE status='completed')::int AS completed,
        COUNT(*) FILTER (WHERE status='cancelled')::int AS cancelled,
        (SELECT COUNT(*)::int FROM crm_journey_actions WHERE status='pending') AS pending,
        (SELECT COUNT(*)::int FROM crm_journey_actions WHERE status='sent') AS sent,
        (SELECT COUNT(*)::int FROM crm_journey_actions WHERE status='waiting_content') AS waiting_content,
        (SELECT COUNT(*)::int FROM crm_journey_actions WHERE status='delivery_unknown') AS delivery_unknown,
        (SELECT COUNT(*)::int FROM crm_journey_actions WHERE status='failed') AS failed
       FROM crm_journey_enrollments WHERE journey_code=$1`,
      [B2B_SOFA_JOURNEY_CODE],
    ),
    query<EnrollmentRow & { lead_name: string }>(
      `SELECT e.*,COALESCE(l.data->>'name',e.lead_id) AS lead_name
       FROM crm_journey_enrollments e LEFT JOIN crm_leads l ON l.id=e.lead_id
       WHERE e.journey_code=$1 ORDER BY e.updated_at DESC LIMIT 20`,
      [B2B_SOFA_JOURNEY_CODE],
    ),
    query<ActionRow>(
      `SELECT a.* FROM crm_journey_actions a
       JOIN crm_journey_enrollments e ON e.id=a.enrollment_id
       WHERE e.journey_code=$1 ORDER BY a.updated_at DESC LIMIT 40`,
      [B2B_SOFA_JOURNEY_CODE],
    ),
  ]);
  return {
    settings,
    stats: Object.fromEntries(Object.entries(statRow || {}).map(([key, value]) => [key, Number(value || 0)])),
    recentEnrollments: enrollmentRows.map(row => ({ ...mapEnrollment(row), leadName: row.lead_name })),
    recentActions: actionRows.map(mapAction),
  };
}
