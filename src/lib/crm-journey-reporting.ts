import "server-only";

import { randomUUID } from "crypto";
import { query, queryOne } from "@/lib/db";
import { getLeads } from "@/lib/crm-store";
import {
  B2B_SOFA_JOURNEY,
  B2B_SOFA_JOURNEY_CODE,
  DEFAULT_B2B_SOFA_JOURNEY_SETTINGS,
  isEligibleForB2BSofaJourney,
} from "@/lib/crm-b2b-sofa-journey";
import {
  B2C_ERGONOMIC_BED_JOURNEY,
  B2C_ERGONOMIC_BED_JOURNEY_CODE,
  DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS,
  isEligibleForB2CErgonomicBedJourney,
} from "@/lib/crm-b2c-ergonomic-bed-journey";
import type {
  JourneyEnrollmentTimeline,
  JourneyReportChannelRow,
  JourneyReportDailyRow,
  JourneyReportEventType,
  JourneyReportFailureRow,
  JourneyReportFilters,
  JourneyReportFunnelRow,
  JourneyReportLeadRow,
  JourneyReportLinkRow,
  JourneyReportStepRow,
  JourneyReportSummary,
  JourneyReportWorkflowRow,
  JourneyTimelineItem,
  JourneyWorkflowReport,
} from "@/lib/crm-journey-report-types";

const JOURNEY_NAMES: Record<string, string> = {
  [B2B_SOFA_JOURNEY_CODE]: B2B_SOFA_JOURNEY.name,
  [B2C_ERGONOMIC_BED_JOURNEY_CODE]: B2C_ERGONOMIC_BED_JOURNEY.name,
};

const STEP_META = new Map<string, { title: string; objective: string }>(
  [...B2B_SOFA_JOURNEY.steps.map(step => [
    `${B2B_SOFA_JOURNEY_CODE}:${step.id}`,
    { title: step.title, objective: step.objective },
  ] as const), ...B2C_ERGONOMIC_BED_JOURNEY.steps.map(step => [
    `${B2C_ERGONOMIC_BED_JOURNEY_CODE}:${step.id}`,
    { title: step.title, objective: step.objective },
  ] as const)],
);

let reportingSchemaPromise: Promise<void> | null = null;

export async function initJourneyReportingSchema(): Promise<void> {
  if (!reportingSchemaPromise) {
    reportingSchemaPromise = query(`
      CREATE TABLE IF NOT EXISTS crm_journey_events (
        id TEXT PRIMARY KEY,
        journey_code TEXT NOT NULL,
        enrollment_id TEXT NOT NULL,
        action_id TEXT,
        lead_id TEXT NOT NULL,
        step_id TEXT,
        event_type TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT '',
        provider_message_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}',
        idempotency_key TEXT NOT NULL UNIQUE,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_lead_stage_history (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        from_stage TEXT NOT NULL DEFAULT '',
        to_stage TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'crm',
        metadata JSONB NOT NULL DEFAULT '{}',
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_journey_email_tracking (
        token TEXT PRIMARY KEY,
        journey_code TEXT NOT NULL,
        enrollment_id TEXT NOT NULL,
        action_id TEXT NOT NULL UNIQUE,
        lead_id TEXT NOT NULL,
        step_id TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'email',
        provider_message_id TEXT,
        delivered_at TIMESTAMPTZ,
        bounced_at TIMESTAMPTZ,
        complained_at TIMESTAMPTZ,
        opened_at TIMESTAMPTZ,
        clicked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE crm_journey_email_tracking ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
      ALTER TABLE crm_journey_email_tracking ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ;
      ALTER TABLE crm_journey_email_tracking ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ;
      ALTER TABLE crm_journey_email_tracking ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email';

      CREATE INDEX IF NOT EXISTS idx_crm_journey_events_report
        ON crm_journey_events(journey_code,event_type,occurred_at);
      CREATE INDEX IF NOT EXISTS idx_crm_journey_events_enrollment
        ON crm_journey_events(enrollment_id,occurred_at);
      CREATE INDEX IF NOT EXISTS idx_crm_journey_events_action
        ON crm_journey_events(action_id,event_type);
      CREATE INDEX IF NOT EXISTS idx_crm_lead_stage_history_lead
        ON crm_lead_stage_history(lead_id,occurred_at);
      CREATE INDEX IF NOT EXISTS idx_crm_journey_email_provider
        ON crm_journey_email_tracking(provider_message_id);
    `).then(() => undefined).catch(error => {
      reportingSchemaPromise = null;
      throw error;
    });
  }
  return reportingSchemaPromise;
}

export async function recordJourneyEvent(input: {
  journeyCode: string;
  enrollmentId: string;
  actionId?: string | null;
  leadId: string;
  stepId?: string | null;
  eventType: JourneyReportEventType;
  channel?: string;
  providerMessageId?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string | Date;
  idempotencyKey?: string;
}): Promise<void> {
  await initJourneyReportingSchema();
  const occurredAt = input.occurredAt instanceof Date
    ? input.occurredAt.toISOString()
    : input.occurredAt || new Date().toISOString();
  await query(
    `INSERT INTO crm_journey_events
      (id,journey_code,enrollment_id,action_id,lead_id,step_id,event_type,channel,provider_message_id,metadata,idempotency_key,occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [
      randomUUID(), input.journeyCode, input.enrollmentId, input.actionId || null,
      input.leadId, input.stepId || null, input.eventType, input.channel || "",
      input.providerMessageId || null, JSON.stringify(input.metadata || {}),
      input.idempotencyKey || randomUUID(), occurredAt,
    ],
  );
}

export async function recordLeadStageTransition(input: {
  leadId: string;
  fromStage: string;
  toStage: string;
  source?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}): Promise<void> {
  if (!input.toStage || input.fromStage === input.toStage) return;
  await initJourneyReportingSchema();
  const occurredAt = input.occurredAt || new Date().toISOString();
  const historyId = randomUUID();
  await query(
    `INSERT INTO crm_lead_stage_history
      (id,lead_id,from_stage,to_stage,source,metadata,occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
    [historyId, input.leadId, input.fromStage || "", input.toStage, input.source || "crm", JSON.stringify(input.metadata || {}), occurredAt],
  );
  const enrollments = await query<{ id: string; journey_code: string }>(
    `SELECT id,journey_code FROM crm_journey_enrollments
     WHERE lead_id=$1 AND enrolled_at<=$2 AND status<>'cancelled'`,
    [input.leadId, occurredAt],
  ).catch(() => []);
  const eventType: JourneyReportEventType = input.toStage === "won"
    ? "won"
    : input.toStage === "lost" ? "lost" : "stage_changed";
  await Promise.all(enrollments.map(enrollment => recordJourneyEvent({
    journeyCode: enrollment.journey_code,
    enrollmentId: enrollment.id,
    leadId: input.leadId,
    eventType,
    metadata: { fromStage: input.fromStage, toStage: input.toStage, historyId },
    occurredAt,
    idempotencyKey: `stage:${enrollment.id}:${historyId}`,
  })));
}

export async function recordJourneyBusinessEvent(input: {
  leadId: string;
  eventType: "quote_created";
  referenceId: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}): Promise<void> {
  await initJourneyReportingSchema();
  const occurredAt = input.occurredAt || new Date().toISOString();
  const enrollments = await query<{ id: string; journey_code: string }>(
    `SELECT id,journey_code FROM crm_journey_enrollments
     WHERE lead_id=$1 AND enrolled_at<=$2 AND status<>'cancelled'`,
    [input.leadId, occurredAt],
  ).catch(() => []);
  await Promise.all(enrollments.map(enrollment => recordJourneyEvent({
    journeyCode: enrollment.journey_code,
    enrollmentId: enrollment.id,
    leadId: input.leadId,
    eventType: input.eventType,
    metadata: { ...input.metadata, referenceId: input.referenceId },
    occurredAt,
    idempotencyKey: `${input.eventType}:${enrollment.id}:${input.referenceId}`,
  })));
}

export async function recordJourneyReply(input: {
  journeyCode: string;
  enrollmentId: string;
  leadId: string;
  channel: string;
  sourceId?: string;
  reason: string;
  occurredAt?: string;
}): Promise<void> {
  await initJourneyReportingSchema();
  const latestAction = await queryOne<{ id: string; step_id: string; sent_at: string }>(
    `SELECT id,step_id,sent_at FROM crm_journey_actions
     WHERE enrollment_id=$1 AND status='sent' ORDER BY sent_at DESC LIMIT 1`,
    [input.enrollmentId],
  );
  await recordJourneyEvent({
    journeyCode: input.journeyCode,
    enrollmentId: input.enrollmentId,
    actionId: latestAction?.id,
    leadId: input.leadId,
    stepId: latestAction?.step_id,
    eventType: "replied",
    channel: input.channel,
    metadata: { reason: input.reason, sourceId: input.sourceId || "" },
    occurredAt: input.occurredAt,
    idempotencyKey: input.sourceId
      ? `reply:${input.enrollmentId}:${input.channel}:${input.sourceId}`
      : `reply:first:${input.enrollmentId}:${input.channel}`,
  });
}

function publicOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || process.env.FRONTEND_URL
    || "https://www.smartfurni.com.vn"
  ).replace(/\/$/, "");
}

export interface JourneyEmailTrackingLinks {
  token: string;
  openUrl: string;
  clickBaseUrl: string;
}

export async function createJourneyEmailTracking(input: {
  journeyCode: string;
  enrollmentId: string;
  actionId: string;
  leadId: string;
  stepId: string;
  channel?: string;
}): Promise<JourneyEmailTrackingLinks> {
  await initJourneyReportingSchema();
  const token = randomUUID();
  const row = await queryOne<{ token: string }>(
    `INSERT INTO crm_journey_email_tracking
      (token,journey_code,enrollment_id,action_id,lead_id,step_id,channel)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (action_id) DO UPDATE SET channel=EXCLUDED.channel,updated_at=NOW()
     RETURNING token`,
    [token, input.journeyCode, input.enrollmentId, input.actionId, input.leadId, input.stepId, input.channel || "email"],
  );
  const activeToken = row?.token || token;
  const origin = publicOrigin();
  return {
    token: activeToken,
    openUrl: `${origin}/api/crm/automation/reports/email-open?t=${encodeURIComponent(activeToken)}`,
    clickBaseUrl: `${origin}/api/crm/automation/reports/email-click?t=${encodeURIComponent(activeToken)}&u=`,
  };
}

export function rewriteJourneyTrackedLinks(body: string, clickBaseUrl: string): string {
  return body.replace(/https?:\/\/[^\s]+/g, raw => {
    const trailing = raw.match(/[),.;!?]+$/)?.[0] || "";
    const destination = trailing ? raw.slice(0, -trailing.length) : raw;
    return `${clickBaseUrl}${encodeURIComponent(destination)}${trailing}`;
  });
}

export async function attachJourneyEmailProviderId(token: string, providerMessageId: string): Promise<void> {
  if (!token || !providerMessageId) return;
  await initJourneyReportingSchema();
  await query(
    `UPDATE crm_journey_email_tracking SET provider_message_id=$2,updated_at=NOW() WHERE token=$1`,
    [token, providerMessageId],
  );
}

export async function recordJourneyEmailTrackingEvent(
  token: string,
  eventType: "opened" | "clicked",
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  await initJourneyReportingSchema();
  const tracking = await queryOne<{
    journey_code: string;
    enrollment_id: string;
    action_id: string;
    lead_id: string;
    step_id: string;
    provider_message_id: string | null;
    channel: string;
  }>(`SELECT * FROM crm_journey_email_tracking WHERE token=$1`, [token]);
  if (!tracking) return false;
  await query(
    `UPDATE crm_journey_email_tracking
     SET ${eventType === "opened" ? "opened_at=COALESCE(opened_at,NOW())" : "clicked_at=COALESCE(clicked_at,NOW())"},updated_at=NOW()
     WHERE token=$1`,
    [token],
  );
  await recordJourneyEvent({
    journeyCode: tracking.journey_code,
    enrollmentId: tracking.enrollment_id,
    actionId: tracking.action_id,
    leadId: tracking.lead_id,
    stepId: tracking.step_id,
    eventType,
    channel: tracking.channel || "email",
    providerMessageId: tracking.provider_message_id || undefined,
    metadata,
    idempotencyKey: `${tracking.channel || "email"}:${eventType}:${token}`,
  });
  return true;
}

export async function recordJourneyEmailProviderEvent(input: {
  providerMessageId: string;
  providerEventId: string;
  eventType: "delivered" | "bounced" | "complained" | "opened" | "clicked" | "failed" | "delivery_unknown";
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  if (!input.providerMessageId || !input.providerEventId) return false;
  await initJourneyReportingSchema();
  const tracking = await queryOne<{
    token: string;
    journey_code: string;
    enrollment_id: string;
    action_id: string;
    lead_id: string;
    step_id: string;
  }>(`SELECT token,journey_code,enrollment_id,action_id,lead_id,step_id
      FROM crm_journey_email_tracking WHERE provider_message_id=$1`, [input.providerMessageId]);
  if (!tracking) return false;

  const timestampColumn = input.eventType === "delivered"
    ? "delivered_at"
    : input.eventType === "bounced"
      ? "bounced_at"
      : input.eventType === "complained"
        ? "complained_at"
        : input.eventType === "opened"
          ? "opened_at"
          : input.eventType === "clicked" ? "clicked_at" : "";
  if (timestampColumn) {
    await query(
      `UPDATE crm_journey_email_tracking
       SET ${timestampColumn}=COALESCE(${timestampColumn},$2),updated_at=NOW() WHERE token=$1`,
      [tracking.token, input.occurredAt || new Date().toISOString()],
    );
  }
  await recordJourneyEvent({
    journeyCode: tracking.journey_code,
    enrollmentId: tracking.enrollment_id,
    actionId: tracking.action_id,
    leadId: tracking.lead_id,
    stepId: tracking.step_id,
    eventType: input.eventType,
    channel: "email",
    providerMessageId: input.providerMessageId,
    occurredAt: input.occurredAt,
    metadata: input.metadata,
    idempotencyKey: `resend:${input.providerEventId}`,
  });
  return true;
}

function dayString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateAtVietnamStart(value: string): Date {
  return new Date(`${value}T00:00:00+07:00`);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

export function normalizeJourneyReportFilters(input: Partial<JourneyReportFilters>): JourneyReportFilters {
  const today = dayString(new Date());
  const defaultFrom = dayString(addDays(dateAtVietnamStart(today), -29));
  const requestedTo = /^\d{4}-\d{2}-\d{2}$/.test(input.to || "") ? String(input.to) : today;
  let requestedFrom = /^\d{4}-\d{2}-\d{2}$/.test(input.from || "") ? String(input.from) : defaultFrom;
  const toDate = dateAtVietnamStart(requestedTo);
  const minimumFrom = addDays(toDate, -365);
  const fromDate = dateAtVietnamStart(requestedFrom);
  if (!Number.isFinite(fromDate.getTime()) || fromDate > toDate || fromDate < minimumFrom) {
    requestedFrom = dayString(addDays(toDate, -29));
  }
  return {
    from: requestedFrom,
    to: requestedTo,
    journeyCode: JOURNEY_NAMES[input.journeyCode || ""] ? String(input.journeyCode) : "",
    channel: ["zalo_personal", "zalo_oa", "email"].includes(input.channel || "") ? String(input.channel) : "",
    source: String(input.source || "").slice(0, 120),
    assignedTo: String(input.assignedTo || "").slice(0, 120),
  };
}

function buildScope(filters: JourneyReportFilters): { sql: string; params: unknown[]; channelSql: string } {
  const from = dateAtVietnamStart(filters.from).toISOString();
  const toExclusive = addDays(dateAtVietnamStart(filters.to), 1).toISOString();
  const params: unknown[] = [from, toExclusive];
  const clauses = ["e.enrolled_at >= $1", "e.enrolled_at < $2"];
  if (filters.journeyCode) {
    params.push(filters.journeyCode);
    clauses.push(`e.journey_code=$${params.length}`);
  }
  if (filters.source) {
    params.push(filters.source);
    clauses.push(`COALESCE(l.data->>'source','')=$${params.length}`);
  }
  if (filters.assignedTo) {
    params.push(filters.assignedTo);
    clauses.push(`COALESCE(l.data->>'assignedTo','')=$${params.length}`);
  }
  let channelSql = "";
  if (filters.channel) {
    params.push(filters.channel);
    channelSql = `$${params.length}`;
    // Giữ channel trong parameter list của mọi truy vấn dùng scoped CTE,
    // kể cả truy vấn chỉ đếm enrollment và không lọc action trực tiếp.
    clauses.push(`${channelSql}::text=${channelSql}::text`);
  }
  return {
    sql: `SELECT e.*,l.data AS lead_data FROM crm_journey_enrollments e
      LEFT JOIN crm_leads l ON l.id=e.lead_id WHERE ${clauses.join(" AND ")}`,
    params,
    channelSql,
  };
}

function numberValue(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percentage(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

function isoValue(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : String(value);
}

async function countEligibleNow(filters: JourneyReportFilters): Promise<number> {
  const leads = await getLeads({ canonicalize: true });
  const matching = leads.filter(lead =>
    (!filters.source || lead.source === filters.source)
    && (!filters.assignedTo || lead.assignedTo === filters.assignedTo),
  );
  const eligible = new Set<string>();
  for (const lead of matching) {
    if ((!filters.journeyCode || filters.journeyCode === B2B_SOFA_JOURNEY_CODE)
      && isEligibleForB2BSofaJourney(lead, DEFAULT_B2B_SOFA_JOURNEY_SETTINGS).eligible) eligible.add(lead.id);
    if ((!filters.journeyCode || filters.journeyCode === B2C_ERGONOMIC_BED_JOURNEY_CODE)
      && isEligibleForB2CErgonomicBedJourney(lead, DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS).eligible) eligible.add(lead.id);
  }
  return eligible.size;
}

export async function getJourneyWorkflowReport(
  rawFilters: Partial<JourneyReportFilters>,
): Promise<JourneyWorkflowReport> {
  await initJourneyReportingSchema();
  const filters = normalizeJourneyReportFilters(rawFilters);
  const scope = buildScope(filters);
  const actionChannel = scope.channelSql
    ? `(a.primary_channel=${scope.channelSql} OR a.sent_channel=${scope.channelSql} OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(a.attempts) attempt WHERE attempt->>'channel'=${scope.channelSql}
      ))`
    : "TRUE";
  const eventChannel = scope.channelSql ? `ev.channel=${scope.channelSql}` : "TRUE";
  const summaryLegacyReply = scope.channelSql ? "FALSE" : "paused_reason ILIKE '%phản hồi%'";
  const scopedLegacyReply = scope.channelSql ? "FALSE" : "s.paused_reason ILIKE '%phản hồi%'";

  const [summaryRow, workflowRowsRaw, stepRowsRaw, channelRowsRaw, channelEventRows, dailyEnrollments, dailySent, dailyResponses, dailyWon, failureRowsRaw, leadRowsRaw, optionRows, freshness, eligibleNow] = await Promise.all([
    queryOne<Record<string, unknown>>(
      `WITH scoped AS (${scope.sql})
       SELECT
        COUNT(*)::int AS enrolled,
        COUNT(*) FILTER (WHERE status='active')::int AS active,
        COUNT(*) FILTER (WHERE status='paused')::int AS paused,
        COUNT(*) FILTER (WHERE status='completed')::int AS completed,
        COUNT(*) FILTER (WHERE status='cancelled')::int AS cancelled,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM crm_journey_actions a WHERE a.enrollment_id=scoped.id AND a.status='sent' AND ${actionChannel}))::int AS contacted,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM crm_journey_events ev WHERE ev.enrollment_id=scoped.id AND ev.event_type='replied' AND ${eventChannel}) OR ${summaryLegacyReply})::int AS responded,
        COUNT(*) FILTER (WHERE COALESCE(lead_data->>'stage','') IN ('quoted','negotiating','won') OR EXISTS (SELECT 1 FROM crm_quotes q WHERE q.lead_id=scoped.lead_id AND q.updated_at>=scoped.enrolled_at))::int AS quoted,
        COUNT(*) FILTER (WHERE COALESCE(lead_data->>'stage','') IN ('negotiating','won'))::int AS negotiating,
        COUNT(*) FILTER (WHERE COALESCE(lead_data->>'stage','')='won')::int AS won,
        COUNT(*) FILTER (WHERE COALESCE(lead_data->>'stage','')='lost')::int AS lost,
        COUNT(*) FILTER (WHERE paused_reason ILIKE ANY(ARRAY['%không liên hệ%','%không làm phiền%','%unsubscribe%','%dnc%']))::int AS unsubscribed,
        COALESCE(SUM(CASE WHEN COALESCE(lead_data->>'stage','')='won' THEN COALESCE(NULLIF(lead_data->>'expectedValue','')::numeric,0) ELSE 0 END),0)::numeric AS assisted_revenue,
        COALESCE(SUM(CASE WHEN COALESCE(lead_data->>'stage','') NOT IN ('won','lost') THEN COALESCE(NULLIF(lead_data->>'expectedValue','')::numeric,0) ELSE 0 END),0)::numeric AS pipeline_value,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN scoped s ON s.id=a.enrollment_id WHERE a.scheduled_at<=NOW() AND ${actionChannel}) AS due_actions,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN scoped s ON s.id=a.enrollment_id WHERE a.status='sent' AND ${actionChannel}) AS sent_actions,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN scoped s ON s.id=a.enrollment_id WHERE a.status='sent' AND a.sent_channel='email' AND ${actionChannel}) AS sent_emails,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN scoped s ON s.id=a.enrollment_id WHERE a.status='failed' AND ${actionChannel}) AS failed_actions,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN scoped s ON s.id=a.enrollment_id WHERE a.status='waiting_content' AND ${actionChannel}) AS waiting_content,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN scoped s ON s.id=a.enrollment_id WHERE a.status='delivery_unknown' AND ${actionChannel}) AS delivery_unknown,
        (SELECT COUNT(DISTINCT ev.action_id)::int FROM crm_journey_events ev JOIN scoped s ON s.id=ev.enrollment_id WHERE ev.event_type='delivered' AND ${eventChannel}) AS delivered_emails,
        (SELECT COUNT(DISTINCT ev.action_id)::int FROM crm_journey_events ev JOIN scoped s ON s.id=ev.enrollment_id WHERE ev.event_type='bounced' AND ${eventChannel}) AS bounced_emails,
        (SELECT COUNT(DISTINCT ev.action_id)::int FROM crm_journey_events ev JOIN scoped s ON s.id=ev.enrollment_id WHERE ev.event_type='complained' AND ${eventChannel}) AS complained_emails,
        (SELECT COUNT(DISTINCT ev.action_id)::int FROM crm_journey_events ev JOIN scoped s ON s.id=ev.enrollment_id WHERE ev.event_type='opened' AND ${eventChannel}) AS opened_messages,
        (SELECT COUNT(DISTINCT ev.action_id)::int FROM crm_journey_events ev JOIN scoped s ON s.id=ev.enrollment_id WHERE ev.event_type='clicked' AND ${eventChannel}) AS clicked_messages,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN scoped s ON s.id=a.enrollment_id WHERE a.status='sent' AND a.sent_channel<>a.primary_channel AND ${actionChannel}) AS fallback_actions,
        (SELECT AVG(EXTRACT(EPOCH FROM (ev.occurred_at-a.sent_at))/3600)
         FROM crm_journey_events ev JOIN crm_journey_actions a ON a.id=ev.action_id JOIN scoped s ON s.id=ev.enrollment_id
         WHERE ev.event_type='replied' AND a.sent_at IS NOT NULL AND ev.occurred_at>=a.sent_at AND ${eventChannel}) AS average_response_hours
       FROM scoped`,
      scope.params,
    ),
    query<Record<string, unknown>>(
      `WITH scoped AS (${scope.sql})
       SELECT s.journey_code,
        COUNT(*)::int AS enrolled,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM crm_journey_actions a WHERE a.enrollment_id=s.id AND a.status='sent' AND ${actionChannel}))::int AS contacted,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM crm_journey_events ev WHERE ev.enrollment_id=s.id AND ev.event_type='replied' AND ${eventChannel}) OR ${scopedLegacyReply})::int AS responded,
        COUNT(*) FILTER (WHERE COALESCE(s.lead_data->>'stage','')='won')::int AS won,
        COALESCE(SUM(CASE WHEN COALESCE(s.lead_data->>'stage','')='won' THEN COALESCE(NULLIF(s.lead_data->>'expectedValue','')::numeric,0) ELSE 0 END),0)::numeric AS assisted_revenue,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN scoped x ON x.id=a.enrollment_id WHERE x.journey_code=s.journey_code AND a.status='sent' AND ${actionChannel}) AS sent,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN scoped x ON x.id=a.enrollment_id WHERE x.journey_code=s.journey_code AND a.status IN ('failed','delivery_unknown') AND ${actionChannel}) AS failed,
        (SELECT COUNT(*)::int FROM crm_journey_actions a JOIN scoped x ON x.id=a.enrollment_id WHERE x.journey_code=s.journey_code AND a.scheduled_at<=NOW() AND ${actionChannel}) AS due
       FROM scoped s GROUP BY s.journey_code ORDER BY enrolled DESC`,
      scope.params,
    ),
    query<Record<string, unknown>>(
      `WITH scoped AS (${scope.sql})
       SELECT s.journey_code,a.step_id,a.day_offset,
        COUNT(*) FILTER (WHERE a.scheduled_at<=NOW())::int AS due,
        COUNT(*) FILTER (WHERE a.status='sent')::int AS sent,
        COUNT(*) FILTER (WHERE a.status='failed')::int AS failed,
        COUNT(*) FILTER (WHERE a.status='waiting_content')::int AS waiting_content,
        COUNT(*) FILTER (WHERE a.status='delivery_unknown')::int AS delivery_unknown,
        COUNT(*) FILTER (WHERE a.status='sent' AND a.sent_channel<>a.primary_channel)::int AS fallback_sent,
        COUNT(DISTINCT a.id) FILTER (WHERE EXISTS (SELECT 1 FROM crm_journey_events ev WHERE ev.action_id=a.id AND ev.event_type='replied'))::int AS responses,
        COUNT(DISTINCT a.id) FILTER (WHERE EXISTS (SELECT 1 FROM crm_journey_events ev WHERE ev.action_id=a.id AND ev.event_type='opened'))::int AS opened,
        COUNT(DISTINCT a.id) FILTER (WHERE EXISTS (SELECT 1 FROM crm_journey_events ev WHERE ev.action_id=a.id AND ev.event_type='clicked'))::int AS clicked,
        COUNT(DISTINCT a.id) FILTER (WHERE EXISTS (
          SELECT 1 FROM crm_lead_stage_history h WHERE h.lead_id=a.lead_id AND h.occurred_at>=a.sent_at
          AND h.occurred_at<a.sent_at+INTERVAL '7 days' AND h.to_stage IN ('surveyed','quoted','negotiating','won')
        ))::int AS stage_advanced,
        COUNT(DISTINCT a.id) FILTER (WHERE EXISTS (SELECT 1 FROM crm_journey_events ev WHERE ev.action_id=a.id AND ev.event_type='unsubscribed'))::int AS unsubscribed
       FROM scoped s JOIN crm_journey_actions a ON a.enrollment_id=s.id
       WHERE ${actionChannel}
       GROUP BY s.journey_code,a.step_id,a.day_offset ORDER BY s.journey_code,a.day_offset`,
      scope.params,
    ),
    query<Record<string, unknown>>(
      `WITH scoped AS (${scope.sql}), attempts AS (
        SELECT a.id,a.enrollment_id,a.primary_channel,a.sent_channel,
          attempt->>'channel' AS channel,attempt->>'outcome' AS outcome
        FROM scoped s JOIN crm_journey_actions a ON a.enrollment_id=s.id
        CROSS JOIN LATERAL jsonb_array_elements(a.attempts) attempt
        WHERE attempt->>'channel'<>'system'
      )
      SELECT channel,COUNT(*)::int AS attempted,
        COUNT(*) FILTER (WHERE outcome='sent')::int AS sent,
        COUNT(*) FILTER (WHERE outcome='definitive_failure')::int AS failed,
        COUNT(*) FILTER (WHERE outcome='delivery_unknown')::int AS delivery_unknown,
        COUNT(*) FILTER (WHERE outcome='sent' AND sent_channel<>primary_channel)::int AS fallback_sent
      FROM attempts WHERE ($${scope.params.length + 1}='' OR channel=$${scope.params.length + 1})
      GROUP BY channel ORDER BY sent DESC`,
      [...scope.params, filters.channel],
    ),
    query<Record<string, unknown>>(
      `WITH scoped AS (${scope.sql})
       SELECT ev.channel,
        COUNT(DISTINCT ev.enrollment_id) FILTER (WHERE ev.event_type='replied')::int AS responses,
        COUNT(DISTINCT ev.action_id) FILTER (WHERE ev.event_type='delivered')::int AS delivered,
        COUNT(DISTINCT ev.action_id) FILTER (WHERE ev.event_type='bounced')::int AS bounced,
        COUNT(DISTINCT ev.action_id) FILTER (WHERE ev.event_type='complained')::int AS complained,
        COUNT(DISTINCT ev.action_id) FILTER (WHERE ev.event_type='opened')::int AS opened,
        COUNT(DISTINCT ev.action_id) FILTER (WHERE ev.event_type='clicked')::int AS clicked
       FROM scoped s JOIN crm_journey_events ev ON ev.enrollment_id=s.id
       WHERE ev.event_type IN ('replied','delivered','bounced','complained','opened','clicked') AND ($${scope.params.length + 1}='' OR ev.channel=$${scope.params.length + 1})
       GROUP BY ev.channel`,
      [...scope.params, filters.channel],
    ),
    query<Record<string, unknown>>(
      `WITH scoped AS (${scope.sql}) SELECT TO_CHAR(enrolled_at AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD') AS date,COUNT(*)::int AS count
       FROM scoped GROUP BY 1 ORDER BY 1`, scope.params,
    ),
    query<Record<string, unknown>>(
      `WITH scoped AS (${scope.sql}) SELECT TO_CHAR(a.sent_at AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD') AS date,COUNT(*)::int AS count
       FROM scoped s JOIN crm_journey_actions a ON a.enrollment_id=s.id
       WHERE a.status='sent' AND a.sent_at IS NOT NULL AND ${actionChannel} GROUP BY 1 ORDER BY 1`, scope.params,
    ),
    query<Record<string, unknown>>(
      `WITH scoped AS (${scope.sql}) SELECT TO_CHAR(ev.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD') AS date,COUNT(DISTINCT ev.enrollment_id)::int AS count
       FROM scoped s JOIN crm_journey_events ev ON ev.enrollment_id=s.id
       WHERE ev.event_type='replied' AND ${eventChannel} GROUP BY 1 ORDER BY 1`, scope.params,
    ),
    query<Record<string, unknown>>(
      `WITH scoped AS (${scope.sql}) SELECT TO_CHAR(h.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD') AS date,COUNT(DISTINCT h.lead_id)::int AS count
       FROM scoped s JOIN crm_lead_stage_history h ON h.lead_id=s.lead_id AND h.occurred_at>=s.enrolled_at
       WHERE h.to_stage='won' GROUP BY 1 ORDER BY 1`, scope.params,
    ),
    query<Record<string, unknown>>(
      `WITH scoped AS (${scope.sql}), operational_failures AS (
        SELECT a.status,COALESCE(NULLIF(a.sent_channel,''),a.primary_channel) AS channel,
          COALESCE(NULLIF(a.error,''),'Không có mô tả lỗi') AS error,a.updated_at AS occurred_at
        FROM scoped s JOIN crm_journey_actions a ON a.enrollment_id=s.id
        WHERE a.status IN ('failed','delivery_unknown','waiting_content') AND ${actionChannel}
        UNION ALL
        SELECT ev.event_type AS status,ev.channel,
          CASE ev.event_type
            WHEN 'bounced' THEN 'Email bị máy chủ nhận trả lại'
            WHEN 'complained' THEN 'Người nhận đánh dấu email là spam'
            WHEN 'delivery_unknown' THEN 'Nhà cung cấp báo giao email chậm'
            ELSE COALESCE(NULLIF(ev.metadata->>'reason',''),'Nhà cung cấp email báo gửi thất bại')
          END AS error,ev.occurred_at
        FROM scoped s JOIN crm_journey_events ev ON ev.enrollment_id=s.id
        WHERE ev.event_type IN ('bounced','complained','failed','delivery_unknown') AND ${eventChannel}
      )
       SELECT status,channel,error,COUNT(*)::int AS count,MAX(occurred_at) AS last_occurred_at
       FROM operational_failures GROUP BY 1,2,3 ORDER BY count DESC,last_occurred_at DESC LIMIT 30`, scope.params,
    ),
    query<Record<string, unknown>>(
      `WITH scoped AS (${scope.sql})
       SELECT s.id AS enrollment_id,s.journey_code,s.lead_id,
        COALESCE(s.lead_data->>'name',s.lead_id) AS lead_name,
        COALESCE(s.lead_data->>'company','') AS company,
        COALESCE(s.lead_data->>'source','') AS source,
        COALESCE(s.lead_data->>'assignedTo','') AS assigned_to,
        COALESCE(s.lead_data->>'stage','') AS stage,s.status AS enrollment_status,
        s.enrolled_at,s.last_outbound_at,s.paused_reason,
        COALESCE(NULLIF(s.lead_data->>'expectedValue','')::numeric,0) AS expected_value,
        COUNT(a.id) FILTER (WHERE a.scheduled_at<=NOW() AND ${actionChannel})::int AS due_steps,
        COUNT(a.id) FILTER (WHERE a.status='sent' AND ${actionChannel})::int AS sent_steps,
        EXISTS (SELECT 1 FROM crm_journey_events ev WHERE ev.enrollment_id=s.id AND ev.event_type='replied' AND ${eventChannel}) OR ${scopedLegacyReply} AS responded,
        (ARRAY_AGG(a.step_id ORDER BY a.sent_at DESC NULLS LAST) FILTER (WHERE a.status='sent' AND ${actionChannel}))[1] AS last_step_id,
        MAX(a.sent_at) FILTER (WHERE a.status='sent' AND ${actionChannel}) AS last_step_at
       FROM scoped s LEFT JOIN crm_journey_actions a ON a.enrollment_id=s.id
       GROUP BY s.id,s.journey_code,s.lead_id,s.lead_data,s.status,s.enrolled_at,s.last_outbound_at,s.paused_reason
       ORDER BY s.enrolled_at DESC LIMIT 200`, scope.params,
    ),
    query<Record<string, unknown>>(
      `SELECT DISTINCT e.journey_code,COALESCE(l.data->>'source','') AS source,COALESCE(l.data->>'assignedTo','') AS assigned_to
       FROM crm_journey_enrollments e LEFT JOIN crm_leads l ON l.id=e.lead_id`,
    ),
    queryOne<Record<string, unknown>>(
      `SELECT (SELECT MAX(updated_at) FROM crm_journey_actions) AS last_action_at,
              (SELECT MAX(occurred_at) FROM crm_journey_events) AS last_event_at`,
    ),
    countEligibleNow(filters).catch(() => 0),
  ]);

  const raw = summaryRow || {};
  const summary: JourneyReportSummary = {
    eligibleNow,
    enrolled: numberValue(raw.enrolled),
    active: numberValue(raw.active),
    paused: numberValue(raw.paused),
    completed: numberValue(raw.completed),
    cancelled: numberValue(raw.cancelled),
    contacted: numberValue(raw.contacted),
    responded: numberValue(raw.responded),
    quoted: numberValue(raw.quoted),
    negotiating: numberValue(raw.negotiating),
    won: numberValue(raw.won),
    lost: numberValue(raw.lost),
    unsubscribed: numberValue(raw.unsubscribed),
    dueActions: numberValue(raw.due_actions),
    sentActions: numberValue(raw.sent_actions),
    failedActions: numberValue(raw.failed_actions),
    waitingContent: numberValue(raw.waiting_content),
    deliveryUnknown: numberValue(raw.delivery_unknown),
    deliveredEmails: numberValue(raw.delivered_emails),
    bouncedEmails: numberValue(raw.bounced_emails),
    complainedEmails: numberValue(raw.complained_emails),
    openedMessages: numberValue(raw.opened_messages),
    clickedMessages: numberValue(raw.clicked_messages),
    fallbackActions: numberValue(raw.fallback_actions),
    sendSuccessRate: 0,
    responseRate: 0,
    quoteRate: 0,
    winRate: 0,
    fallbackRate: 0,
    openRate: 0,
    clickRate: 0,
    averageResponseHours: raw.average_response_hours == null ? null : Math.round(numberValue(raw.average_response_hours) * 10) / 10,
    assistedRevenue: numberValue(raw.assisted_revenue),
    pipelineValue: numberValue(raw.pipeline_value),
  };
  summary.sendSuccessRate = percentage(summary.sentActions, summary.dueActions);
  summary.responseRate = percentage(summary.responded, summary.contacted);
  summary.quoteRate = percentage(summary.quoted, summary.enrolled);
  summary.winRate = percentage(summary.won, summary.enrolled);
  summary.fallbackRate = percentage(summary.fallbackActions, summary.sentActions);
  summary.openRate = percentage(summary.openedMessages, numberValue(raw.sent_emails));
  summary.clickRate = percentage(summary.clickedMessages, summary.sentActions);

  const funnelCounts = [
    ["enrolled", "Đã vào workflow", summary.enrolled],
    ["contacted", "Đã tiếp cận", summary.contacted],
    ["responded", "Có phản hồi", summary.responded],
    ["quoted", "Đã báo giá", summary.quoted],
    ["negotiating", "Đang thương thảo", summary.negotiating],
    ["won", "Chốt thành công", summary.won],
  ] as const;
  const funnel: JourneyReportFunnelRow[] = funnelCounts.map(([key, label, count], index) => ({
    key,
    label,
    count,
    rateFromPrevious: index === 0 ? 100 : percentage(count, funnelCounts[index - 1][2]),
    rateFromEnrolled: percentage(count, summary.enrolled),
  }));

  const workflows: JourneyReportWorkflowRow[] = workflowRowsRaw.map(row => {
    const enrolled = numberValue(row.enrolled);
    const contacted = numberValue(row.contacted);
    const sent = numberValue(row.sent);
    const due = numberValue(row.due);
    const responded = numberValue(row.responded);
    const won = numberValue(row.won);
    return {
      journeyCode: String(row.journey_code || ""),
      journeyName: JOURNEY_NAMES[String(row.journey_code || "")] || String(row.journey_code || ""),
      enrolled, contacted, responded, sent,
      failed: numberValue(row.failed), won,
      assistedRevenue: numberValue(row.assisted_revenue),
      sendSuccessRate: percentage(sent, due),
      responseRate: percentage(responded, contacted),
      winRate: percentage(won, enrolled),
    };
  });

  const channelEvents = new Map(channelEventRows.map(row => [String(row.channel || ""), row]));
  const channels: JourneyReportChannelRow[] = channelRowsRaw.map(row => {
    const channel = String(row.channel || "");
    const events = channelEvents.get(channel) || {};
    const attempted = numberValue(row.attempted);
    const sent = numberValue(row.sent);
    const responses = numberValue(events.responses);
    return {
      channel, attempted, sent,
      failed: numberValue(row.failed),
      deliveryUnknown: numberValue(row.delivery_unknown),
      delivered: numberValue(events.delivered),
      bounced: numberValue(events.bounced),
      complained: numberValue(events.complained),
      fallbackSent: numberValue(row.fallback_sent),
      responses,
      opened: numberValue(events.opened),
      clicked: numberValue(events.clicked),
      successRate: percentage(sent, attempted),
      responseRate: percentage(responses, sent),
    };
  });

  const steps: JourneyReportStepRow[] = stepRowsRaw.map(row => {
    const journeyCode = String(row.journey_code || "");
    const stepId = String(row.step_id || "");
    const meta = STEP_META.get(`${journeyCode}:${stepId}`);
    const due = numberValue(row.due);
    const sent = numberValue(row.sent);
    const responses = numberValue(row.responses);
    return {
      journeyCode, stepId,
      dayOffset: numberValue(row.day_offset),
      title: meta?.title || stepId,
      objective: meta?.objective || "",
      due, sent, responses,
      failed: numberValue(row.failed),
      waitingContent: numberValue(row.waiting_content),
      deliveryUnknown: numberValue(row.delivery_unknown),
      fallbackSent: numberValue(row.fallback_sent),
      opened: numberValue(row.opened),
      clicked: numberValue(row.clicked),
      stageAdvanced: numberValue(row.stage_advanced),
      unsubscribed: numberValue(row.unsubscribed),
      successRate: percentage(sent, due),
      responseRate: percentage(responses, sent),
    };
  });

  const failures: JourneyReportFailureRow[] = failureRowsRaw.map(row => ({
    status: String(row.status || ""),
    channel: String(row.channel || ""),
    error: String(row.error || ""),
    count: numberValue(row.count),
    lastOccurredAt: isoValue(row.last_occurred_at),
  }));

  const leads: JourneyReportLeadRow[] = leadRowsRaw.map(row => ({
    enrollmentId: String(row.enrollment_id || ""),
    journeyCode: String(row.journey_code || ""),
    leadId: String(row.lead_id || ""),
    leadName: String(row.lead_name || ""),
    company: String(row.company || ""),
    source: String(row.source || ""),
    assignedTo: String(row.assigned_to || ""),
    stage: String(row.stage || ""),
    enrollmentStatus: String(row.enrollment_status || ""),
    enrolledAt: isoValue(row.enrolled_at),
    lastOutboundAt: row.last_outbound_at ? isoValue(row.last_outbound_at) : null,
    sentSteps: numberValue(row.sent_steps),
    dueSteps: numberValue(row.due_steps),
    responded: Boolean(row.responded),
    lastStepId: String(row.last_step_id || ""),
    lastStepAt: row.last_step_at ? isoValue(row.last_step_at) : null,
    expectedValue: numberValue(row.expected_value),
    pausedReason: String(row.paused_reason || ""),
  }));

  const linkRowsRaw = await query<Record<string, unknown>>(
    `WITH scoped AS (${scope.sql})
     SELECT ev.channel,ev.metadata->>'url' AS url,COUNT(*)::int AS clicks,
       COUNT(DISTINCT ev.action_id)::int AS unique_actions,MAX(ev.occurred_at) AS last_clicked_at
     FROM crm_journey_events ev JOIN scoped s ON s.id=ev.enrollment_id
     WHERE ev.event_type='clicked' AND COALESCE(ev.metadata->>'url','')<>'' AND ${eventChannel}
     GROUP BY ev.channel,ev.metadata->>'url' ORDER BY clicks DESC,last_clicked_at DESC LIMIT 100`,
    scope.params,
  );
  const links: JourneyReportLinkRow[] = linkRowsRaw.map(row => ({
    channel: String(row.channel || ""), url: String(row.url || ""), clicks: numberValue(row.clicks),
    uniqueActions: numberValue(row.unique_actions), lastClickedAt: isoValue(row.last_clicked_at),
  }));
  const operations: Record<string, unknown> = await queryOne<Record<string, unknown>>(
    `SELECT
      (SELECT COUNT(*) FROM crm_automation_rule_executions WHERE claimed_at::date BETWEEN $1::date AND $2::date)::int AS generic_executions,
      (SELECT COUNT(*) FROM crm_automation_rule_executions WHERE status='failed' AND claimed_at::date BETWEEN $1::date AND $2::date)::int AS generic_failed,
      (SELECT COUNT(*) FROM crm_notification_logs WHERE action_type='sla' AND sent_at::date BETWEEN $1::date AND $2::date)::int AS sla_alerts,
      ((SELECT COUNT(*) FROM crm_automation_email_queue WHERE status IN ('pending','processing'))+(SELECT COUNT(*) FROM crm_automation_zalo_queue WHERE status IN ('pending','processing')))::int AS queued_pending,
      (SELECT COUNT(*) FROM crm_notification_logs WHERE status='sent' AND sent_at::date BETWEEN $1::date AND $2::date)::int AS notification_sent,
      (SELECT COUNT(*) FROM crm_notification_logs WHERE status='failed' AND sent_at::date BETWEEN $1::date AND $2::date)::int AS notification_failed`,
    [filters.from, filters.to],
  ).catch(() => null) || {};

  const dailyMap = new Map<string, JourneyReportDailyRow>();
  for (let cursor = dateAtVietnamStart(filters.from); cursor <= dateAtVietnamStart(filters.to); cursor = addDays(cursor, 1)) {
    const date = dayString(cursor);
    dailyMap.set(date, { date, enrolled: 0, sent: 0, responses: 0, won: 0 });
  }
  for (const [rows, key] of [[dailyEnrollments, "enrolled"], [dailySent, "sent"], [dailyResponses, "responses"], [dailyWon, "won"]] as const) {
    for (const row of rows) {
      const current = dailyMap.get(String(row.date || ""));
      if (current) current[key] = numberValue(row.count);
    }
  }

  const workflowOptions = Array.from(new Set([
    B2B_SOFA_JOURNEY_CODE,
    B2C_ERGONOMIC_BED_JOURNEY_CODE,
    ...optionRows.map(row => String(row.journey_code || "")).filter(Boolean),
  ]));
  const sourceOptions = Array.from(new Set(optionRows.map(row => String(row.source || "")).filter(Boolean))).sort();
  const assigneeOptions = Array.from(new Set(optionRows.map(row => String(row.assigned_to || "")).filter(Boolean))).sort();

  return {
    generatedAt: new Date().toISOString(),
    filters,
    dataFreshness: {
      lastActionAt: freshness?.last_action_at ? isoValue(freshness.last_action_at) : null,
      lastEventAt: freshness?.last_event_at ? isoValue(freshness.last_event_at) : null,
      note: "Phản hồi, delivered/bounce và open/click bắt đầu được ghi chi tiết từ khi mô-đun báo cáo được triển khai; dữ liệu gửi cũ vẫn được tổng hợp từ action hiện có.",
    },
    operations: {
      genericExecutions: numberValue(operations?.generic_executions), genericFailed: numberValue(operations?.generic_failed),
      slaAlerts: numberValue(operations?.sla_alerts), queuedPending: numberValue(operations?.queued_pending),
      notificationSent: numberValue(operations?.notification_sent), notificationFailed: numberValue(operations?.notification_failed),
    },
    options: {
      workflows: workflowOptions.map(value => ({ value, label: JOURNEY_NAMES[value] || value })),
      sources: sourceOptions.map(value => ({ value, label: value })),
      assignees: assigneeOptions.map(value => ({ value, label: value })),
      channels: [
        { value: "zalo_personal", label: "Zalo cá nhân" },
        { value: "zalo_oa", label: "Zalo OA" },
        { value: "email", label: "Email" },
      ],
    },
    summary,
    funnel,
    daily: Array.from(dailyMap.values()),
    workflows,
    channels,
    steps,
    failures,
    links,
    leads,
  };
}

export async function getJourneyEnrollmentTimeline(enrollmentId: string): Promise<JourneyEnrollmentTimeline | null> {
  await initJourneyReportingSchema();
  const enrollment = await queryOne<Record<string, unknown>>(
    `SELECT e.*,COALESCE(l.data->>'name',e.lead_id) AS lead_name,
      COALESCE(l.data->>'company','') AS company,COALESCE(l.data->>'stage','') AS lead_stage
     FROM crm_journey_enrollments e LEFT JOIN crm_leads l ON l.id=e.lead_id WHERE e.id=$1`,
    [enrollmentId],
  );
  if (!enrollment) return null;
  const [actions, events, stages] = await Promise.all([
    query<Record<string, unknown>>(`SELECT * FROM crm_journey_actions WHERE enrollment_id=$1 ORDER BY scheduled_at`, [enrollmentId]),
    query<Record<string, unknown>>(`SELECT * FROM crm_journey_events WHERE enrollment_id=$1 ORDER BY occurred_at`, [enrollmentId]),
    query<Record<string, unknown>>(
      `SELECT * FROM crm_lead_stage_history WHERE lead_id=$1 AND occurred_at>=$2 ORDER BY occurred_at`,
      [enrollment.lead_id, enrollment.enrolled_at],
    ),
  ]);
  const items: JourneyTimelineItem[] = [{
    id: `enrolled:${enrollmentId}`,
    type: "enrolled",
    title: "Tham gia workflow",
    detail: JOURNEY_NAMES[String(enrollment.journey_code || "")] || String(enrollment.journey_code || ""),
    channel: "",
    occurredAt: isoValue(enrollment.enrolled_at),
    status: String(enrollment.status || ""),
  }];
  for (const action of actions) {
    items.push({
      id: `action:${String(action.id)}`,
      type: "action",
      title: STEP_META.get(`${String(enrollment.journey_code)}:${String(action.step_id)}`)?.title || String(action.step_id),
      detail: String(action.error || ""),
      channel: String(action.sent_channel || action.primary_channel || ""),
      occurredAt: isoValue(action.sent_at || action.updated_at || action.scheduled_at),
      status: String(action.status || ""),
    });
  }
  for (const event of events) {
    const metadata = typeof event.metadata === "string" ? JSON.parse(event.metadata) : (event.metadata || {});
    items.push({
      id: `event:${String(event.id)}`,
      type: String(event.event_type || "event"),
      title: String(event.event_type || "Sự kiện"),
      detail: String(metadata.reason || metadata.toStage || metadata.url || ""),
      channel: String(event.channel || ""),
      occurredAt: isoValue(event.occurred_at),
      status: "recorded",
    });
  }
  for (const stage of stages) {
    items.push({
      id: `stage:${String(stage.id)}`,
      type: "stage_changed",
      title: `Chuyển giai đoạn: ${String(stage.from_stage || "-")} → ${String(stage.to_stage || "")}`,
      detail: String(stage.source || "crm"),
      channel: "crm",
      occurredAt: isoValue(stage.occurred_at),
      status: String(stage.to_stage || ""),
    });
  }
  items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  return {
    enrollmentId,
    journeyCode: String(enrollment.journey_code || ""),
    leadId: String(enrollment.lead_id || ""),
    leadName: String(enrollment.lead_name || ""),
    company: String(enrollment.company || ""),
    stage: String(enrollment.lead_stage || ""),
    enrollmentStatus: String(enrollment.status || ""),
    items,
  };
}
