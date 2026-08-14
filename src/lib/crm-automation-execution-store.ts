import "server-only";

import { query, queryOne } from "@/lib/db";

export interface AutomationEmailQueueJob {
  id: string;
  dedupeKey: string;
  ruleId: string;
  ruleName: string;
  leadId: string;
  leadName: string;
  recipient: string;
  subject: string;
  body: string;
  fromName: string;
  mediaAssetIds: string[];
  scheduledAt: string;
  attempts: number;
}

let schemaReady = false;

export async function initAutomationExecutionSchema(): Promise<void> {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS crm_automation_rule_executions (
      rule_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      trigger_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      retry_after TIMESTAMPTZ,
      actions JSONB NOT NULL DEFAULT '[]'::jsonb,
      error TEXT,
      PRIMARY KEY (rule_id, lead_id, trigger_key)
    );
    CREATE INDEX IF NOT EXISTS idx_crm_automation_rule_executions_status
      ON crm_automation_rule_executions(status, retry_after, claimed_at);

    CREATE TABLE IF NOT EXISTS crm_automation_email_queue (
      id TEXT PRIMARY KEY,
      dedupe_key TEXT NOT NULL UNIQUE,
      rule_id TEXT NOT NULL,
      rule_name TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      lead_name TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      from_name TEXT NOT NULL DEFAULT 'SmartFurni',
      media_asset_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      scheduled_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      claimed_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_crm_automation_email_queue_due
      ON crm_automation_email_queue(status, scheduled_at);

    CREATE TABLE IF NOT EXISTS crm_automation_scheduler_locks (
      key TEXT PRIMARY KEY,
      locked_until TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  schemaReady = true;
}

export async function claimAutomationSchedulerRun(
  key = "crm_automation",
  lockMinutes = 15,
): Promise<boolean> {
  await initAutomationExecutionSchema();
  const row = await queryOne<{ key: string }>(
    `INSERT INTO crm_automation_scheduler_locks (key, locked_until)
     VALUES ($1, NOW() + ($2::text || ' minutes')::interval)
     ON CONFLICT (key) DO UPDATE SET
       locked_until=EXCLUDED.locked_until, updated_at=NOW()
     WHERE crm_automation_scheduler_locks.locked_until <= NOW()
     RETURNING key`,
    [key, Math.max(1, Math.min(lockMinutes, 60))],
  );
  return Boolean(row);
}

export async function releaseAutomationSchedulerRun(key = "crm_automation"): Promise<void> {
  await query(
    `UPDATE crm_automation_scheduler_locks SET locked_until=NOW(), updated_at=NOW() WHERE key=$1`,
    [key],
  );
}

export async function claimAutomationExecution(input: {
  ruleId: string;
  leadId: string;
  triggerKey: string;
}): Promise<boolean> {
  await initAutomationExecutionSchema();
  const row = await queryOne<{ rule_id: string }>(
    `INSERT INTO crm_automation_rule_executions
       (rule_id, lead_id, trigger_key, status, claimed_at)
     VALUES ($1, $2, $3, 'processing', NOW())
     ON CONFLICT (rule_id, lead_id, trigger_key) DO UPDATE SET
       status='processing', claimed_at=NOW(), completed_at=NULL, retry_after=NULL, error=NULL
     WHERE (
       crm_automation_rule_executions.status='failed'
       AND COALESCE(crm_automation_rule_executions.retry_after, NOW()) <= NOW()
     ) OR (
       crm_automation_rule_executions.status='processing'
       AND crm_automation_rule_executions.claimed_at < NOW() - INTERVAL '30 minutes'
     )
     RETURNING rule_id`,
    [input.ruleId, input.leadId, input.triggerKey],
  );
  return Boolean(row);
}

export async function completeAutomationExecution(input: {
  ruleId: string;
  leadId: string;
  triggerKey: string;
  actions: string[];
}): Promise<void> {
  await query(
    `UPDATE crm_automation_rule_executions
     SET status='completed', completed_at=NOW(), actions=$4::jsonb, error=NULL, retry_after=NULL
     WHERE rule_id=$1 AND lead_id=$2 AND trigger_key=$3`,
    [input.ruleId, input.leadId, input.triggerKey, JSON.stringify(input.actions)],
  );
}

export async function failAutomationExecution(input: {
  ruleId: string;
  leadId: string;
  triggerKey: string;
  actions: string[];
  error: string;
  retry?: boolean;
  retryMinutes?: number;
}): Promise<void> {
  const retryMinutes = Math.max(5, Math.min(input.retryMinutes ?? 30, 24 * 60));
  await query(
    `UPDATE crm_automation_rule_executions
     SET status=$6, completed_at=NOW(), actions=$4::jsonb, error=$5,
         retry_after=CASE WHEN $6='failed'
           THEN NOW() + ($7::text || ' minutes')::interval ELSE NULL END
     WHERE rule_id=$1 AND lead_id=$2 AND trigger_key=$3`,
    [
      input.ruleId, input.leadId, input.triggerKey, JSON.stringify(input.actions),
      input.error.slice(0, 2_000), input.retry ? "failed" : "failed_terminal", retryMinutes,
    ],
  );
}

export async function enqueueAutomationEmail(input: {
  dedupeKey: string;
  ruleId: string;
  ruleName: string;
  leadId: string;
  leadName: string;
  recipient: string;
  subject: string;
  body: string;
  fromName: string;
  mediaAssetIds: string[];
  scheduledAt: Date;
}): Promise<{ queued: boolean; id: string }> {
  await initAutomationExecutionSchema();
  const id = `aemail-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO crm_automation_email_queue
       (id, dedupe_key, rule_id, rule_name, lead_id, lead_name, recipient,
        subject, body, from_name, media_asset_ids, scheduled_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
     ON CONFLICT (dedupe_key) DO NOTHING
     RETURNING id`,
    [
      id, input.dedupeKey, input.ruleId, input.ruleName, input.leadId, input.leadName,
      input.recipient, input.subject, input.body, input.fromName,
      JSON.stringify([...new Set(input.mediaAssetIds)].slice(0, 10)), input.scheduledAt.toISOString(),
    ],
  );
  return { queued: Boolean(row), id: row?.id || id };
}

export async function claimDueAutomationEmails(limit = 20): Promise<AutomationEmailQueueJob[]> {
  await initAutomationExecutionSchema();
  const rows = await query<Record<string, unknown>>(
    `WITH due AS (
       SELECT id FROM crm_automation_email_queue
       WHERE (
         status='pending' AND scheduled_at <= NOW()
       ) OR (
         status='processing' AND claimed_at < NOW() - INTERVAL '30 minutes'
       )
       ORDER BY scheduled_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     UPDATE crm_automation_email_queue q
     SET status='processing', claimed_at=NOW(), attempts=q.attempts+1, updated_at=NOW()
     FROM due WHERE q.id=due.id
     RETURNING q.*`,
    [Math.max(1, Math.min(limit, 100))],
  );
  return rows.map(row => ({
    id: String(row.id),
    dedupeKey: String(row.dedupe_key),
    ruleId: String(row.rule_id),
    ruleName: String(row.rule_name),
    leadId: String(row.lead_id),
    leadName: String(row.lead_name),
    recipient: String(row.recipient),
    subject: String(row.subject),
    body: String(row.body),
    fromName: String(row.from_name),
    mediaAssetIds: (typeof row.media_asset_ids === "string" ? JSON.parse(row.media_asset_ids) : row.media_asset_ids || []) as string[],
    scheduledAt: String(row.scheduled_at),
    attempts: Number(row.attempts || 0),
  }));
}

export async function markAutomationEmailSent(id: string): Promise<void> {
  await query(
    `UPDATE crm_automation_email_queue
     SET status='sent', sent_at=NOW(), claimed_at=NULL, last_error=NULL, updated_at=NOW()
     WHERE id=$1`,
    [id],
  );
}

export async function markAutomationEmailFailed(input: {
  id: string;
  error: string;
  retry: boolean;
  attempts: number;
}): Promise<void> {
  const terminal = !input.retry || input.attempts >= 5;
  const retryMinutes = Math.min(15 * Math.pow(2, Math.max(0, input.attempts - 1)), 12 * 60);
  await query(
    `UPDATE crm_automation_email_queue
     SET status=$2, scheduled_at=CASE WHEN $2='pending'
           THEN NOW() + ($3::text || ' minutes')::interval ELSE scheduled_at END,
         claimed_at=NULL, last_error=$4, updated_at=NOW()
     WHERE id=$1`,
    [input.id, terminal ? "failed" : "pending", retryMinutes, input.error.slice(0, 2_000)],
  );
}
