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
  journeyDefinitionWithOverrides,
  scheduleJourneyStep,
  type B2BSofaJourneySettings,
  type JourneyChannel,
  type JourneyStepDefinition,
} from "@/lib/crm-b2b-sofa-journey";
import { recordJourneyEvent } from "@/lib/crm-journey-reporting";
import type {
  JourneyReplyIntent,
  JourneyReplyRecommendation,
} from "@/lib/crm-journey-reply-ai";

export interface JourneySettingsBase {
  enabled: boolean;
  autoEnroll: boolean;
  autoEnrollExisting: boolean;
  canaryMode: boolean;
  canaryLeadIds: string[];
  activationAt: string | null;
  timezone: "Asia/Ho_Chi_Minh";
  businessHoursStart: string;
  businessHoursEnd: string;
  maxMessagesPerSevenDays: number;
  automationAccountId: string;
  stepOverrides: Record<string, {
    enabled?: boolean;
    day?: number;
    sendHour?: number;
    sendMinute?: number;
    primaryChannel?: JourneyChannel;
    fallbackChannels?: JourneyChannel[];
    emailSubject?: string;
    emailBody?: string;
    zaloBody?: string;
    mediaAssetIds?: string[];
  }>;
  doNotContactTags: string[];
}

export interface JourneyDefinitionBase {
  code: string;
  version: number;
  steps: JourneyStepDefinition[];
}

export type JourneyEnrollmentStatus = "active" | "paused" | "completed" | "cancelled";
export type JourneyReplyReviewStatus = "pending_review" | "accepted" | "dismissed";
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
  pauseUntil: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface JourneyReplyReviewRecord {
  id: string;
  journeyCode: string;
  enrollmentId: string;
  leadId: string;
  channel: string;
  sourceId: string;
  inboundAt: string;
  message: string;
  intent: JourneyReplyIntent;
  recommendation: JourneyReplyRecommendation;
  reason: string;
  confidence: number;
  suggestedPauseUntil: string | null;
  status: JourneyReplyReviewStatus;
  reviewedBy: string;
  reviewedAt: string | null;
  createdAt: string;
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
  pause_until: string | null;
  completed_at: string | null;
  updated_at: string;
}

interface ReplyReviewRow {
  id: string;
  journey_code: string;
  enrollment_id: string;
  lead_id: string;
  channel: string;
  source_id: string;
  inbound_at: string;
  message: string;
  intent: JourneyReplyIntent;
  recommendation: JourneyReplyRecommendation;
  reason: string;
  confidence: number | string;
  suggested_pause_until: string | null;
  status: JourneyReplyReviewStatus;
  reviewed_by: string;
  reviewed_at: string | null;
  created_at: string;
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
    pauseUntil: row.pause_until ? String(row.pause_until) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    updatedAt: String(row.updated_at),
  };
}

function mapReplyReview(row: ReplyReviewRow): JourneyReplyReviewRecord {
  return {
    id: row.id,
    journeyCode: row.journey_code,
    enrollmentId: row.enrollment_id,
    leadId: row.lead_id,
    channel: row.channel,
    sourceId: row.source_id,
    inboundAt: String(row.inbound_at),
    message: row.message || "",
    intent: row.intent,
    recommendation: row.recommendation,
    reason: row.reason || "",
    confidence: Number(row.confidence || 0),
    suggestedPauseUntil: row.suggested_pause_until ? String(row.suggested_pause_until) : null,
    status: row.status,
    reviewedBy: row.reviewed_by || "",
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at),
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
      pause_until TIMESTAMPTZ,
      reply_scanned_at TIMESTAMPTZ,
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

    CREATE TABLE IF NOT EXISTS crm_journey_reply_reviews (
      id TEXT PRIMARY KEY,
      journey_code TEXT NOT NULL,
      enrollment_id TEXT NOT NULL REFERENCES crm_journey_enrollments(id) ON DELETE CASCADE,
      lead_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      source_id TEXT NOT NULL,
      inbound_at TIMESTAMPTZ NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      intent TEXT NOT NULL DEFAULT 'neutral',
      recommendation TEXT NOT NULL DEFAULT 'continue',
      reason TEXT NOT NULL DEFAULT '',
      confidence NUMERIC NOT NULL DEFAULT 0,
      suggested_pause_until TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'pending_review',
      reviewed_by TEXT NOT NULL DEFAULT '',
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (enrollment_id, channel, source_id)
    );

    ALTER TABLE crm_journey_enrollments ADD COLUMN IF NOT EXISTS pause_until TIMESTAMPTZ;
    ALTER TABLE crm_journey_enrollments ADD COLUMN IF NOT EXISTS reply_scanned_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_crm_journey_actions_due
      ON crm_journey_actions(status, COALESCE(next_attempt_at, scheduled_at));
    CREATE INDEX IF NOT EXISTS idx_crm_journey_actions_lead
      ON crm_journey_actions(lead_id, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_crm_journey_enrollments_status
      ON crm_journey_enrollments(journey_code, status, enrolled_at);
    CREATE INDEX IF NOT EXISTS idx_crm_journey_reply_reviews_pending
      ON crm_journey_reply_reviews(journey_code,status,created_at DESC);
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

export async function getJourneySettings<T extends JourneySettingsBase>(
  journeyCode: string,
  defaults: T,
): Promise<T> {
  await initB2BSofaJourneySchema();
  const row = await queryOne<{ settings: Partial<T> | string }>(
    `SELECT settings FROM crm_journey_settings WHERE journey_code=$1`,
    [journeyCode],
  );
  const stored = row ? jsonValue(row.settings, {}) : {};
  return { ...defaults, ...stored };
}

export async function getB2BSofaJourneySettings(): Promise<B2BSofaJourneySettings> {
  return getJourneySettings(B2B_SOFA_JOURNEY_CODE, DEFAULT_B2B_SOFA_JOURNEY_SETTINGS);
}

export async function saveJourneySettings<T extends JourneySettingsBase>(
  journeyCode: string,
  defaults: T,
  input: Partial<T>,
): Promise<T> {
  await initB2BSofaJourneySchema();
  const current = await getJourneySettings(journeyCode, defaults);
  const enablingNow = !current.enabled && input.enabled === true;
  const settings: T = {
    ...current,
    ...input,
    timezone: "Asia/Ho_Chi_Minh",
    businessHoursStart: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.businessHoursStart ?? current.businessHoursStart)) ? String(input.businessHoursStart ?? current.businessHoursStart) : current.businessHoursStart,
    businessHoursEnd: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.businessHoursEnd ?? current.businessHoursEnd)) ? String(input.businessHoursEnd ?? current.businessHoursEnd) : current.businessHoursEnd,
    activationAt: enablingNow ? new Date().toISOString() : (input.activationAt ?? current.activationAt),
    maxMessagesPerSevenDays: Math.max(1, Math.min(7, Number(input.maxMessagesPerSevenDays ?? current.maxMessagesPerSevenDays))),
    canaryMode: Boolean(input.canaryMode ?? current.canaryMode),
    canaryLeadIds: [...new Set(Array.isArray(input.canaryLeadIds)
      ? input.canaryLeadIds.map(String).filter(Boolean)
      : current.canaryLeadIds || [])].slice(0, 3),
    doNotContactTags: [...new Set(Array.isArray(input.doNotContactTags)
      ? input.doNotContactTags.map(String).map(value => value.trim()).filter(Boolean)
      : current.doNotContactTags || [])],
    stepOverrides: Object.fromEntries(
      Object.entries(input.stepOverrides ?? current.stepOverrides ?? {}).map(([stepId, override]) => {
        const value = override && typeof override === "object" ? override : {};
        return [stepId, {
          enabled: value.enabled === undefined ? undefined : value.enabled !== false,
          day: value.day === undefined ? undefined : Math.max(0, Math.min(365, Number(value.day))),
          sendHour: value.sendHour === undefined ? undefined : Math.max(0, Math.min(23, Number(value.sendHour))),
          sendMinute: value.sendMinute === undefined ? undefined : Math.max(0, Math.min(59, Number(value.sendMinute))),
          primaryChannel: (["zalo_personal", "zalo_oa", "email"].includes(String(value.primaryChannel)) ? value.primaryChannel : undefined) as JourneyChannel | undefined,
          fallbackChannels: value.fallbackChannels === undefined ? undefined : [...new Set(Array.isArray(value.fallbackChannels) ? value.fallbackChannels : [])]
            .filter(channel => ["zalo_personal", "zalo_oa", "email"].includes(String(channel))) as JourneyChannel[] | undefined,
          emailSubject: String(value.emailSubject ?? ""),
          emailBody: String(value.emailBody ?? ""),
          zaloBody: String(value.zaloBody ?? ""),
          mediaAssetIds: [...new Set(Array.isArray(value.mediaAssetIds)
            ? value.mediaAssetIds.map(String).filter(Boolean)
            : [])].slice(0, 10),
        }];
      }),
    ),
  };
  await query(
    `INSERT INTO crm_journey_settings (journey_code,settings,updated_at)
     VALUES ($1,$2::jsonb,NOW())
     ON CONFLICT (journey_code) DO UPDATE SET settings=EXCLUDED.settings,updated_at=NOW()`,
    [journeyCode, JSON.stringify(settings)],
  );
  return settings;
}

export async function saveB2BSofaJourneySettings(
  input: Partial<B2BSofaJourneySettings>,
): Promise<B2BSofaJourneySettings> {
  const settings = await saveJourneySettings(B2B_SOFA_JOURNEY_CODE, DEFAULT_B2B_SOFA_JOURNEY_SETTINGS, input);
  await syncPendingJourneyActions(B2B_SOFA_JOURNEY_CODE, journeyDefinitionWithOverrides(settings));
  return settings;
}

export async function syncPendingJourneyActions(journeyCode: string, definition: JourneyDefinitionBase): Promise<void> {
  await initB2BSofaJourneySchema();
  const enrollments = await query<{ id: string; lead_id: string; enrolled_at: string }>(
    `SELECT id,lead_id,enrolled_at FROM crm_journey_enrollments WHERE journey_code=$1 AND status IN ('active','paused')`,
    [journeyCode],
  );
  const enabledIds = definition.steps.filter(step => step.enabled !== false).map(step => step.id);
  await query(
    `UPDATE crm_journey_actions a SET status='skipped',error='Bước đã bị tắt trong cấu hình workflow.',updated_at=NOW()
     FROM crm_journey_enrollments e WHERE e.id=a.enrollment_id AND e.journey_code=$1
       AND a.status IN ('pending','waiting_content') AND NOT (a.step_id=ANY($2::text[]))`,
    [journeyCode, enabledIds],
  );
  for (const enrollment of enrollments) {
    for (const step of definition.steps.filter(item => item.enabled !== false)) {
      const scheduledAt = scheduleJourneyStep(new Date(enrollment.enrolled_at), step).toISOString();
      await query(
        `INSERT INTO crm_journey_actions
          (id,enrollment_id,lead_id,step_id,day_offset,scheduled_at,status,primary_channel,fallback_channels,content_version)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8::jsonb,$9)
         ON CONFLICT (enrollment_id,step_id) DO UPDATE SET
           day_offset=EXCLUDED.day_offset,scheduled_at=EXCLUDED.scheduled_at,
           primary_channel=EXCLUDED.primary_channel,fallback_channels=EXCLUDED.fallback_channels,
           content_version=EXCLUDED.content_version,
           status=CASE WHEN crm_journey_actions.status='skipped' AND crm_journey_actions.error='Bước đã bị tắt trong cấu hình workflow.' THEN 'pending' ELSE crm_journey_actions.status END,
           error=CASE WHEN crm_journey_actions.status='skipped' AND crm_journey_actions.error='Bước đã bị tắt trong cấu hình workflow.' THEN '' ELSE crm_journey_actions.error END,
           updated_at=NOW()
         WHERE crm_journey_actions.status IN ('pending','waiting_content','skipped')`,
        [`jac-${randomUUID()}`, enrollment.id, enrollment.lead_id, step.id, step.day, scheduledAt, step.primaryChannel, JSON.stringify(step.fallbackChannels), definition.version],
      );
    }
  }
}

export async function getJourneyEnrollmentForCode(
  journeyCode: string,
  leadId: string,
): Promise<JourneyEnrollmentRecord | null> {
  await initB2BSofaJourneySchema();
  const row = await queryOne<EnrollmentRow>(
    `SELECT * FROM crm_journey_enrollments WHERE journey_code=$1 AND lead_id=$2`,
    [journeyCode, leadId],
  );
  return row ? mapEnrollment(row) : null;
}

export async function getJourneyEnrollment(leadId: string): Promise<JourneyEnrollmentRecord | null> {
  return getJourneyEnrollmentForCode(B2B_SOFA_JOURNEY_CODE, leadId);
}

export async function enrollLeadInJourney<T extends JourneySettingsBase>(
  lead: Lead,
  settings: T,
  definition: JourneyDefinitionBase,
  eligibilityCheck: (lead: Lead, settings: T) => { eligible: boolean; reason?: string },
  contextBuilder: (lead: Lead, settings: T, extra?: Record<string, string>) => Record<string, string>,
  input?: { context?: Record<string, string>; automationAccountId?: string; force?: boolean },
): Promise<{ enrollment: JourneyEnrollmentRecord; created: boolean }> {
  await initB2BSofaJourneySchema();
  const eligibility = eligibilityCheck(lead, settings);
  if (!eligibility.eligible && !input?.force) throw new Error(eligibility.reason || "Lead không đủ điều kiện.");

  const existing = await getJourneyEnrollmentForCode(definition.code, lead.id);
  if (existing) return { enrollment: existing, created: false };

  const id = `jen-${randomUUID()}`;
  const enrolledAt = new Date();
  const context = contextBuilder(lead, settings, input?.context || {});
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
      [id, definition.code, definition.version, lead.id, accountId, JSON.stringify(context), enrolledAt.toISOString(), baseline],
    );
    if (!inserted.rows[0]) {
      await client.query("ROLLBACK");
      const raced = await getJourneyEnrollmentForCode(definition.code, lead.id);
      if (!raced) throw new Error("Không thể tạo journey cho lead.");
      return { enrollment: raced, created: false };
    }
    for (const step of definition.steps.filter(item => item.enabled !== false)) {
      await client.query(
        `INSERT INTO crm_journey_actions
          (id,enrollment_id,lead_id,step_id,day_offset,scheduled_at,status,primary_channel,fallback_channels,content_version)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8::jsonb,$9)
         ON CONFLICT (enrollment_id,step_id) DO NOTHING`,
        [
          `jac-${randomUUID()}`, id, lead.id, step.id, step.day,
          scheduleJourneyStep(enrolledAt, step).toISOString(), step.primaryChannel,
          JSON.stringify(step.fallbackChannels), definition.version,
        ],
      );
    }
    await client.query("COMMIT");
    const enrollment = mapEnrollment(inserted.rows[0]);
    await recordJourneyEvent({
      journeyCode: enrollment.journeyCode,
      enrollmentId: enrollment.id,
      leadId: enrollment.leadId,
      eventType: "enrolled",
      occurredAt: enrollment.enrolledAt,
      metadata: {
        journeyVersion: enrollment.journeyVersion,
        source: lead.source || "",
        assignedTo: lead.assignedTo || "",
        stage: lead.stage,
        expectedValue: lead.expectedValue || 0,
      },
      idempotencyKey: `enrolled:${enrollment.id}`,
    }).catch(error => console.error("[Journey report] Không ghi được enrollment:", error));
    return { enrollment, created: true };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function enrollLeadInB2BSofaJourney(
  lead: Lead,
  settings: B2BSofaJourneySettings,
  input?: { context?: Record<string, string>; automationAccountId?: string; force?: boolean },
): Promise<{ enrollment: JourneyEnrollmentRecord; created: boolean }> {
  return enrollLeadInJourney(
    lead,
    settings,
    journeyDefinitionWithOverrides(settings),
    isEligibleForB2BSofaJourney,
    buildJourneyContext,
    input,
  );
}

export async function autoEnrollEligibleB2BSofaLeads(
  settings: B2BSofaJourneySettings,
): Promise<{ checked: number; enrolled: number; skipped: number }> {
  return autoEnrollEligibleJourney(
    settings,
    B2B_SOFA_JOURNEY,
    isEligibleForB2BSofaJourney,
    (lead, currentSettings) => enrollLeadInB2BSofaJourney(lead, currentSettings),
  );
}

export async function autoEnrollEligibleJourney<T extends JourneySettingsBase>(
  settings: T,
  _definition: JourneyDefinitionBase,
  eligibilityCheck: (lead: Lead, settings: T) => { eligible: boolean; reason?: string },
  enroll: (lead: Lead, settings: T) => Promise<{ enrollment: JourneyEnrollmentRecord; created: boolean }>,
): Promise<{ checked: number; enrolled: number; skipped: number }> {
  if (!settings.enabled || !settings.autoEnroll) return { checked: 0, enrolled: 0, skipped: 0 };
  const leads = await getLeads();
  let enrolled = 0;
  let skipped = 0;
  const activationAt = settings.activationAt ? new Date(settings.activationAt).getTime() : Date.now();
  for (const lead of leads) {
    if (settings.canaryMode && !settings.canaryLeadIds.includes(lead.id)) {
      skipped += 1;
      continue;
    }
    if (!settings.autoEnrollExisting && new Date(lead.createdAt).getTime() < activationAt) {
      skipped += 1;
      continue;
    }
    const eligible = eligibilityCheck(lead, settings);
    if (!eligible.eligible) {
      skipped += 1;
      continue;
    }
    const result = await enroll(lead, settings).catch(() => null);
    if (result?.created) enrolled += 1;
  }
  return { checked: leads.length, enrolled, skipped };
}

export async function claimDueJourneyActions(
  limit = 20,
  allowedLeadIds: string[] | null = null,
): Promise<JourneyActionRecord[]> {
  return claimDueJourneyActionsForCode(B2B_SOFA_JOURNEY_CODE, limit, allowedLeadIds);
}

export async function claimDueJourneyActionsForCode(
  journeyCode: string,
  limit = 20,
  allowedLeadIds: string[] | null = null,
): Promise<JourneyActionRecord[]> {
  await initB2BSofaJourneySchema();
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    // Các lần tạm dừng có thời hạn do nhân viên chọn sẽ tự tiếp tục đúng hạn.
    await client.query(
      `UPDATE crm_journey_enrollments
       SET status='active',paused_reason='',pause_until=NULL,updated_at=NOW()
       WHERE journey_code=$1 AND status='paused' AND pause_until IS NOT NULL AND pause_until<=NOW()`,
      [journeyCode],
    );
    // Không tự gửi lại một job đã mất kết nối sau khi bắt đầu gửi; cần đối soát thủ công.
    await client.query(
      `UPDATE crm_journey_actions a
       SET status='delivery_unknown',error='Worker mất kết nối sau khi claim; cần đối soát trước khi gửi lại.',updated_at=NOW()
       FROM crm_journey_enrollments e
       WHERE e.id=a.enrollment_id AND e.journey_code=$1
         AND a.status='sending' AND a.claimed_at < NOW()-INTERVAL '15 minutes'`,
      [journeyCode],
    );
    const rows = await client.query<ActionRow>(
      `SELECT a.*
       FROM crm_journey_actions a
       JOIN crm_journey_enrollments e ON e.id=a.enrollment_id
       WHERE e.status='active' AND e.journey_code=$1
         AND ($3::text[] IS NULL OR a.lead_id=ANY($3::text[]))
         AND a.status IN ('pending','waiting_content')
         AND COALESCE(a.next_attempt_at,a.scheduled_at)<=NOW()
       ORDER BY COALESCE(a.next_attempt_at,a.scheduled_at),a.day_offset
       FOR UPDATE OF a SKIP LOCKED
       LIMIT $2`,
      [journeyCode, Math.max(1, Math.min(100, Math.trunc(limit))), allowedLeadIds],
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

export async function makeCanaryDayZeroActionsDue(
  journeyCode: string,
  leadIds: string[],
): Promise<number> {
  await initB2BSofaJourneySchema();
  if (!leadIds.length) return 0;
  const rows = await query<{ id: string }>(
    `UPDATE crm_journey_actions a
     SET scheduled_at=NOW(),next_attempt_at=NULL,error='',updated_at=NOW()
     FROM crm_journey_enrollments e
     WHERE e.id=a.enrollment_id AND e.journey_code=$1
       AND a.lead_id=ANY($2::text[]) AND a.day_offset=0
       AND e.status='active' AND a.status IN ('pending','waiting_content')
     RETURNING a.id`,
    [journeyCode, leadIds],
  );
  return rows.length;
}

export async function getEnrollmentById(id: string): Promise<JourneyEnrollmentRecord | null> {
  await initB2BSofaJourneySchema();
  const row = await queryOne<EnrollmentRow>(`SELECT * FROM crm_journey_enrollments WHERE id=$1`, [id]);
  return row ? mapEnrollment(row) : null;
}

export async function getJourneyEnrollmentsForReplyScan(
  journeyCode: string,
  limit = 100,
): Promise<JourneyEnrollmentRecord[]> {
  await initB2BSofaJourneySchema();
  const rows = await query<EnrollmentRow>(
    `SELECT * FROM crm_journey_enrollments
     WHERE journey_code=$1 AND status IN ('active','paused')
     ORDER BY reply_scanned_at ASC NULLS FIRST,enrolled_at ASC LIMIT $2`,
    [journeyCode, Math.max(1, Math.min(500, Math.trunc(limit)))],
  );
  if (rows.length) {
    await query(
      `UPDATE crm_journey_enrollments SET reply_scanned_at=NOW() WHERE id=ANY($1::text[])`,
      [rows.map(row => row.id)],
    );
  }
  return rows.map(mapEnrollment);
}

export async function createJourneyReplyReview(input: {
  journeyCode: string;
  enrollmentId: string;
  leadId: string;
  channel: string;
  sourceId: string;
  inboundAt: string;
  message: string;
  intent: JourneyReplyIntent;
  recommendation: JourneyReplyRecommendation;
  reason: string;
  confidence: number;
  suggestedPauseUntil?: string | null;
}): Promise<{ review: JourneyReplyReviewRecord | null; created: boolean }> {
  await initB2BSofaJourneySchema();
  const row = await queryOne<ReplyReviewRow>(
    `INSERT INTO crm_journey_reply_reviews
      (id,journey_code,enrollment_id,lead_id,channel,source_id,inbound_at,message,intent,
       recommendation,reason,confidence,suggested_pause_until,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending_review')
     ON CONFLICT (enrollment_id,channel,source_id) DO NOTHING
     RETURNING *`,
    [
      `jrr-${randomUUID()}`, input.journeyCode, input.enrollmentId, input.leadId,
      input.channel, input.sourceId, input.inboundAt, input.message.slice(0, 5000), input.intent,
      input.recommendation, input.reason.slice(0, 1000), Math.max(0, Math.min(1, input.confidence)),
      input.suggestedPauseUntil || null,
    ],
  );
  return { review: row ? mapReplyReview(row) : null, created: Boolean(row) };
}

export async function getJourneyReplyReview(id: string): Promise<JourneyReplyReviewRecord | null> {
  await initB2BSofaJourneySchema();
  const row = await queryOne<ReplyReviewRow>(`SELECT * FROM crm_journey_reply_reviews WHERE id=$1`, [id]);
  return row ? mapReplyReview(row) : null;
}

export async function resolveJourneyReplyReview(
  id: string,
  status: Exclude<JourneyReplyReviewStatus, "pending_review">,
  reviewedBy: string,
): Promise<JourneyReplyReviewRecord | null> {
  await initB2BSofaJourneySchema();
  const row = await queryOne<ReplyReviewRow>(
    `UPDATE crm_journey_reply_reviews
     SET status=$2,reviewed_by=$3,reviewed_at=NOW(),updated_at=NOW()
     WHERE id=$1 AND status='pending_review' RETURNING *`,
    [id, status, reviewedBy.slice(0, 200)],
  );
  return row ? mapReplyReview(row) : getJourneyReplyReview(id);
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

export async function pauseJourneyEnrollment(id: string, reason: string, until?: Date | null): Promise<void> {
  await initB2BSofaJourneySchema();
  const enrollment = await getEnrollmentById(id);
  await query(
    `UPDATE crm_journey_enrollments
     SET status='paused',paused_reason=$2,pause_until=$3,updated_at=NOW()
     WHERE id=$1 AND status IN ('active','paused')`,
    [id, reason.slice(0, 1000), until?.toISOString() || null],
  );
  if (enrollment) {
    await recordJourneyEvent({
      journeyCode: enrollment.journeyCode,
      enrollmentId: enrollment.id,
      leadId: enrollment.leadId,
      eventType: "paused",
      metadata: { reason, pauseUntil: until?.toISOString() || null },
      idempotencyKey: `paused:${id}:${reason.slice(0, 120)}`,
    }).catch(error => console.error("[Journey report] Không ghi được pause:", error));
  }
}

export async function resumeJourneyEnrollment(id: string): Promise<void> {
  await initB2BSofaJourneySchema();
  const enrollment = await getEnrollmentById(id);
  await query(
    `UPDATE crm_journey_enrollments SET status='active',paused_reason='',pause_until=NULL,updated_at=NOW()
     WHERE id=$1 AND status='paused'`,
    [id],
  );
  if (enrollment) {
    await recordJourneyEvent({
      journeyCode: enrollment.journeyCode,
      enrollmentId: enrollment.id,
      leadId: enrollment.leadId,
      eventType: "resumed",
      idempotencyKey: `resumed:${id}:${Date.now()}`,
    }).catch(error => console.error("[Journey report] Không ghi được resume:", error));
  }
}

export async function completeJourneyEnrollment(id: string, reason: string): Promise<void> {
  await initB2BSofaJourneySchema();
  const enrollment = await getEnrollmentById(id);
  await query(
    `UPDATE crm_journey_enrollments
     SET status='completed',paused_reason=$2,pause_until=NULL,completed_at=NOW(),updated_at=NOW()
     WHERE id=$1 AND status IN ('active','paused')`,
    [id, reason.slice(0, 1000)],
  );
  await query(
    `UPDATE crm_journey_actions SET status='cancelled',error=$2,claimed_at=NULL,updated_at=NOW()
     WHERE enrollment_id=$1 AND status IN ('pending','waiting_content','sending')`,
    [id, reason.slice(0, 1000)],
  );
  if (enrollment) {
    await recordJourneyEvent({
      journeyCode: enrollment.journeyCode,
      enrollmentId: enrollment.id,
      leadId: enrollment.leadId,
      eventType: "stage_changed",
      metadata: { reason, journeyCompletedManually: true },
      idempotencyKey: `completed-manually:${id}`,
    }).catch(error => console.error("[Journey report] Không ghi được complete:", error));
  }
}

export async function cancelJourneyEnrollment(id: string, reason: string): Promise<void> {
  await initB2BSofaJourneySchema();
  const enrollment = await getEnrollmentById(id);
  await query(
    `UPDATE crm_journey_enrollments SET status='cancelled',paused_reason=$2,pause_until=NULL,completed_at=NOW(),updated_at=NOW()
     WHERE id=$1 AND status IN ('active','paused');
    `,
    [id, reason.slice(0, 1000)],
  );
  await query(
    `UPDATE crm_journey_actions SET status='cancelled',error=$2,claimed_at=NULL,updated_at=NOW()
     WHERE enrollment_id=$1 AND status IN ('pending','waiting_content','sending')`,
    [id, reason.slice(0, 1000)],
  );
  if (enrollment) {
    const unsubscribed = /không liên hệ|không làm phiền|unsubscribe|dnc/i.test(reason);
    await recordJourneyEvent({
      journeyCode: enrollment.journeyCode,
      enrollmentId: enrollment.id,
      leadId: enrollment.leadId,
      eventType: unsubscribed ? "unsubscribed" : "cancelled",
      metadata: { reason },
      idempotencyKey: `cancelled:${id}`,
    }).catch(error => console.error("[Journey report] Không ghi được cancel:", error));
  }
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
  recentEnrollments: Array<JourneyEnrollmentRecord & { leadName: string; replyReview: JourneyReplyReviewRecord | null }>;
  recentActions: JourneyActionRecord[];
}> {
  return getJourneyDashboard(B2B_SOFA_JOURNEY_CODE, DEFAULT_B2B_SOFA_JOURNEY_SETTINGS);
}

export async function getJourneyDashboard<T extends JourneySettingsBase>(
  journeyCode: string,
  defaults: T,
): Promise<{
  settings: T;
  stats: Record<string, number>;
  recentEnrollments: Array<JourneyEnrollmentRecord & { leadName: string; replyReview: JourneyReplyReviewRecord | null }>;
  recentActions: JourneyActionRecord[];
}> {
  await initB2BSofaJourneySchema();
  const settings = await getJourneySettings(journeyCode, defaults);
  const [statRow, enrollmentRows, actionRows, reviewRows] = await Promise.all([
    queryOne<Record<string, number>>(
      `SELECT
        COUNT(*) FILTER (WHERE status='active')::int AS active,
        COUNT(*) FILTER (WHERE status='paused')::int AS paused,
        COUNT(*) FILTER (WHERE status='completed')::int AS completed,
        COUNT(*) FILTER (WHERE status='cancelled')::int AS cancelled,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN crm_journey_enrollments x ON x.id=a.enrollment_id WHERE x.journey_code=$1 AND a.status='pending') AS pending,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN crm_journey_enrollments x ON x.id=a.enrollment_id WHERE x.journey_code=$1 AND a.status='sent') AS sent,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN crm_journey_enrollments x ON x.id=a.enrollment_id WHERE x.journey_code=$1 AND a.status='waiting_content') AS waiting_content,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN crm_journey_enrollments x ON x.id=a.enrollment_id WHERE x.journey_code=$1 AND a.status='delivery_unknown') AS delivery_unknown,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN crm_journey_enrollments x ON x.id=a.enrollment_id WHERE x.journey_code=$1 AND a.status='failed') AS failed,
        (SELECT COUNT(*)::int FROM crm_journey_reply_reviews r WHERE r.journey_code=$1 AND r.status='pending_review') AS pending_review
       FROM crm_journey_enrollments WHERE journey_code=$1`,
      [journeyCode],
    ),
    query<EnrollmentRow & { lead_name: string }>(
      `SELECT e.*,COALESCE(l.data->>'name',e.lead_id) AS lead_name
       FROM crm_journey_enrollments e LEFT JOIN crm_leads l ON l.id=e.lead_id
       WHERE e.journey_code=$1 ORDER BY e.updated_at DESC LIMIT 20`,
      [journeyCode],
    ),
    query<ActionRow>(
      `SELECT a.* FROM crm_journey_actions a
       JOIN crm_journey_enrollments e ON e.id=a.enrollment_id
       WHERE e.journey_code=$1 ORDER BY a.updated_at DESC LIMIT 40`,
      [journeyCode],
    ),
    query<ReplyReviewRow>(
      `SELECT DISTINCT ON (enrollment_id) * FROM crm_journey_reply_reviews
       WHERE journey_code=$1 AND status='pending_review'
       ORDER BY enrollment_id,inbound_at DESC`,
      [journeyCode],
    ),
  ]);
  const reviewsByEnrollment = new Map(
    reviewRows.map(row => [row.enrollment_id, mapReplyReview(row)] as const),
  );
  return {
    settings,
    stats: Object.fromEntries(Object.entries(statRow || {}).map(([key, value]) => [key, Number(value || 0)])),
    recentEnrollments: enrollmentRows.map(row => ({
      ...mapEnrollment(row),
      leadName: row.lead_name,
      replyReview: reviewsByEnrollment.get(row.id) || null,
    })),
    recentActions: actionRows.map(mapAction),
  };
}
