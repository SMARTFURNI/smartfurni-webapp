import { randomUUID } from "crypto";

// ── Server-only DB helpers ───────────
async function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  const db = await import("./db");
  return db.query<T>(sql, params);
}
async function queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null> {
  const db = await import("./db");
  return db.queryOne<T>(sql, params);
}

// ─── Schema Init ──────────────────────────────────────────────────────────────

let schemaInitialized = false;

export async function initEmailMarketingSchema(): Promise<void> {
  if (schemaInitialized) return;

  // Email Templates
  await query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Campaigns
  await query(`
    CREATE TABLE IF NOT EXISTS email_campaigns (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Automation Workflows
  await query(`
    CREATE TABLE IF NOT EXISTS email_workflows (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      data JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'inactive',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Email Logs
  await query(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      campaign_id TEXT,
      workflow_id TEXT,
      template_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      data JSONB NOT NULL,
      sent_at TIMESTAMPTZ,
      opened_at TIMESTAMPTZ,
      clicked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Lead Segments
  await query(`
    CREATE TABLE IF NOT EXISTS lead_segments (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  schemaInitialized = true;
  console.log("[db] Email Marketing schema initialized");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  targetSegments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailWorkflow {
  id: string;
  campaignId: string;
  name: string;
  triggerType: 'new_lead' | 'tag_added' | 'score_changed' | 'manual';
  triggerConfig: any;
  status: 'active' | 'inactive';
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  stepOrder: number;
  type: 'action_send_email' | 'delay' | 'condition_opened' | 'condition_clicked';
  config: any;
  nextStepId: string | null;
}

export interface EmailLog {
  id: string;
  leadId: string;
  campaignId?: string;
  workflowId?: string;
  templateId?: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  errorMessage?: string;
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  createdAt: string;
}

export interface LeadSegment {
  id: string;
  name: string;
  criteria: any;
  createdAt: string;
  updatedAt: string;
}

// ─── CRUD Operations ──────────────────────────────────────────────────────────

// Templates
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  await initEmailMarketingSchema();
  const rows = await query<{ data: EmailTemplate }>(`SELECT data FROM email_templates ORDER BY created_at DESC`);
  return rows.map(r => r.data);
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  await initEmailMarketingSchema();
  const row = await queryOne<{ data: EmailTemplate }>(`SELECT data FROM email_templates WHERE id = $1`, [id]);
  return row ? row.data : null;
}

export async function saveEmailTemplate(template: EmailTemplate): Promise<void> {
  await initEmailMarketingSchema();
  await query(
    `INSERT INTO email_templates (id, data, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [template.id, JSON.stringify(template)]
  );
}

// Campaigns
export async function getEmailCampaigns(): Promise<EmailCampaign[]> {
  await initEmailMarketingSchema();
  const rows = await query<{ data: EmailCampaign }>(`SELECT data FROM email_campaigns ORDER BY created_at DESC`);
  return rows.map(r => r.data);
}

export async function saveEmailCampaign(campaign: EmailCampaign): Promise<void> {
  await initEmailMarketingSchema();
  await query(
    `INSERT INTO email_campaigns (id, data, status, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, status = EXCLUDED.status, updated_at = NOW()`,
    [campaign.id, JSON.stringify(campaign), campaign.status]
  );
}

// Workflows
export async function getEmailWorkflows(): Promise<EmailWorkflow[]> {
  await initEmailMarketingSchema();
  const rows = await query<{ data: EmailWorkflow }>(`SELECT data FROM email_workflows ORDER BY created_at DESC`);
  return rows.map(r => r.data);
}

export async function saveEmailWorkflow(workflow: EmailWorkflow): Promise<void> {
  await initEmailMarketingSchema();
  await query(
    `INSERT INTO email_workflows (id, campaign_id, data, status, updated_at) VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (id) DO UPDATE SET campaign_id = EXCLUDED.campaign_id, data = EXCLUDED.data, status = EXCLUDED.status, updated_at = NOW()`,
    [workflow.id, workflow.campaignId, JSON.stringify(workflow), workflow.status]
  );
}

// Logs
export async function getEmailLogs(leadId?: string): Promise<EmailLog[]> {
  await initEmailMarketingSchema();
  let sql = `SELECT data FROM email_logs`;
  const params: any[] = [];
  if (leadId) {
    sql += ` WHERE lead_id = $1`;
    params.push(leadId);
  }
  sql += ` ORDER BY created_at DESC`;
  const rows = await query<{ data: EmailLog }>(sql, params);
  return rows.map(r => r.data);
}

export async function saveEmailLog(log: EmailLog): Promise<void> {
  await initEmailMarketingSchema();
  await query(
    `INSERT INTO email_logs (id, lead_id, campaign_id, workflow_id, template_id, status, data, sent_at, opened_at, clicked_at) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET 
      status = EXCLUDED.status, 
      data = EXCLUDED.data,
      sent_at = EXCLUDED.sent_at,
      opened_at = EXCLUDED.opened_at,
      clicked_at = EXCLUDED.clicked_at`,
    [
      log.id, log.leadId, log.campaignId, log.workflowId, log.templateId, 
      log.status, JSON.stringify(log), 
      log.sentAt || null, log.openedAt || null, log.clickedAt || null
    ]
  );
}

// Segments
export async function getLeadSegments(): Promise<LeadSegment[]> {
  await initEmailMarketingSchema();
  const rows = await query<{ data: LeadSegment }>(`SELECT data FROM lead_segments ORDER BY created_at DESC`);
  return rows.map(r => r.data);
}

export async function saveLeadSegment(segment: LeadSegment): Promise<void> {
  await initEmailMarketingSchema();
  await query(
    `INSERT INTO lead_segments (id, data, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [segment.id, JSON.stringify(segment)]
  );
}
