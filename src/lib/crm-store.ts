/**
 * crm-store.ts — SmartFurni CRM B2B
 * Server-only database functions (PostgreSQL).
 * Types and helpers are in crm-types.ts (safe for client import).
 *
 * NOTE: This file uses pg via db.ts which is Node.js-only.
 * Do NOT import server functions from client components.
 * Client components should import from "@/lib/crm-types" instead.
 */

import { randomUUID } from "crypto";
import type {
  Lead, LeadStage, LeadType, Activity, CrmProduct, Quote, CrmTask,
  CrmStats, CrmSourceStat, StaffPerformance, MonthlyRevenue,
} from "./crm-types";

// Re-export everything from crm-types for backward compatibility
export * from "./crm-types";

// ── Server-only DB helpers (dynamic import prevents client bundling) ───────────
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

export async function initCrmSchema(): Promise<void> {
  if (schemaInitialized) return;

  await query(`
    CREATE TABLE IF NOT EXISTS crm_leads (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      stage TEXT NOT NULL DEFAULT 'new',
      last_contact_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS crm_activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS crm_products (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS crm_quotes (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS crm_tasks (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      data JSONB NOT NULL,
      due_date DATE,
      done BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  try { await query(`CREATE INDEX IF NOT EXISTS idx_crm_activities_lead ON crm_activities(lead_id)`); } catch { /* already exists */ }
  try { await query(`CREATE INDEX IF NOT EXISTS idx_crm_quotes_lead ON crm_quotes(lead_id)`); } catch { /* already exists */ }
  try { await query(`CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead ON crm_tasks(lead_id)`); } catch { /* already exists */ }
  try { await query(`CREATE INDEX IF NOT EXISTS idx_crm_tasks_due ON crm_tasks(due_date)`); } catch { /* already exists */ }
  try { await query(`CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON crm_leads(stage)`); } catch { /* already exists */ }

  schemaInitialized = true;
  console.log("[crm] Schema initialized");
}

// ─── Leads CRUD ───────────────────────────────────────────────────────────────

export async function getLeads(filters?: {
  stage?: LeadStage;
  district?: string;
  type?: LeadType;
  assignedTo?: string;
  search?: string;
}): Promise<Lead[]> {
  await initCrmSchema();

  let sql = `SELECT data FROM crm_leads`;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.stage) {
    conditions.push(`data->>'stage' = $${idx++}`);
    params.push(filters.stage);
  }
  if (filters?.district) {
    conditions.push(`data->>'district' = $${idx++}`);
    params.push(filters.district);
  }
  if (filters?.type) {
    conditions.push(`data->>'type' = $${idx++}`);
    params.push(filters.type);
  }
  if (filters?.assignedTo) {
    conditions.push(`data->>'assignedTo' = $${idx++}`);
    params.push(filters.assignedTo);
  }
  if (filters?.search) {
    conditions.push(`(data->>'name' ILIKE $${idx} OR data->>'company' ILIKE $${idx} OR data->>'phone' ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }
  sql += ` ORDER BY updated_at DESC`;

  const rows = await query<{ data: Lead | string }>(sql, params);
  return rows.map(r => typeof r.data === "string" ? JSON.parse(r.data) : r.data);
}

export async function getLead(id: string): Promise<Lead | null> {
  await initCrmSchema();
  const row = await queryOne<{ data: Lead | string }>(
    `SELECT data FROM crm_leads WHERE id = $1`, [id]
  );
  if (!row) return null;
  return typeof row.data === "string" ? JSON.parse(row.data) : row.data;
}

export async function createLead(input: Omit<Lead, "id" | "createdAt" | "updatedAt">): Promise<Lead> {
  await initCrmSchema();
  const now = new Date().toISOString();
  const lead: Lead = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    lastContactAt: input.lastContactAt || now,
  };
  await query(
    `INSERT INTO crm_leads (id, data, stage, last_contact_at, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
    [lead.id, JSON.stringify(lead), lead.stage, lead.lastContactAt]
  );
  return lead;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
  await initCrmSchema();
  const existing = await getLead(id);
  if (!existing) return null;
  const updated: Lead = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
  await query(
    `UPDATE crm_leads SET data = $1, stage = $2, last_contact_at = $3, updated_at = NOW() WHERE id = $4`,
    [JSON.stringify(updated), updated.stage, updated.lastContactAt, id]
  );
  return updated;
}

export async function updateLeadStage(id: string, stage: LeadStage, lostReason?: string): Promise<Lead | null> {
  return updateLead(id, { stage, ...(lostReason ? { lostReason } : {}) });
}

export async function deleteLead(id: string): Promise<void> {
  await initCrmSchema();
  await query(`DELETE FROM crm_leads WHERE id = $1`, [id]);
  await query(`DELETE FROM crm_activities WHERE lead_id = $1`, [id]);
  await query(`DELETE FROM crm_quotes WHERE lead_id = $1`, [id]);
  await query(`DELETE FROM crm_tasks WHERE lead_id = $1`, [id]);
}

// ─── Activities CRUD ──────────────────────────────────────────────────────────

export async function getActivities(leadId: string): Promise<Activity[]> {
  await initCrmSchema();
  const rows = await query<{ data: Activity | string }>(
    `SELECT data FROM crm_activities WHERE lead_id = $1 ORDER BY created_at DESC`,
    [leadId]
  );
  return rows.map(r => typeof r.data === "string" ? JSON.parse(r.data) : r.data);
}

export async function createActivity(input: Omit<Activity, "id" | "createdAt">): Promise<Activity> {
  await initCrmSchema();
  const activity: Activity = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await query(
    `INSERT INTO crm_activities (id, lead_id, data, created_at) VALUES ($1, $2, $3, NOW())`,
    [activity.id, activity.leadId, JSON.stringify(activity)]
  );
  const existing = await getLead(activity.leadId);
  if (existing) {
    await updateLead(activity.leadId, { lastContactAt: activity.createdAt });
  }
  return activity;
}

export async function deleteActivity(id: string): Promise<void> {
  await initCrmSchema();
  await query(`DELETE FROM crm_activities WHERE id = $1`, [id]);
}

// ─── CRM Products CRUD ────────────────────────────────────────────────────────

export async function getCrmProducts(activeOnly = false): Promise<CrmProduct[]> {
  await initCrmSchema();
  let sql = `SELECT data FROM crm_products`;
  if (activeOnly) sql += ` WHERE data->>'isActive' = 'true'`;
  sql += ` ORDER BY updated_at DESC`;
  const rows = await query<{ data: CrmProduct | string }>(sql);
  return rows.map(r => typeof r.data === "string" ? JSON.parse(r.data) : r.data);
}

export async function getCrmProduct(id: string): Promise<CrmProduct | null> {
  await initCrmSchema();
  const row = await queryOne<{ data: CrmProduct | string }>(
    `SELECT data FROM crm_products WHERE id = $1`, [id]
  );
  if (!row) return null;
  return typeof row.data === "string" ? JSON.parse(row.data) : row.data;
}

export async function upsertCrmProduct(product: CrmProduct): Promise<CrmProduct> {
  await initCrmSchema();
  const updated = { ...product, updatedAt: new Date().toISOString() };
  await query(
    `INSERT INTO crm_products (id, data, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
    [updated.id, JSON.stringify(updated)]
  );
  return updated;
}

// ─── Quotes CRUD ──────────────────────────────────────────────────────────────

export async function getQuotes(leadId?: string): Promise<Quote[]> {
  await initCrmSchema();
  let sql = `SELECT data FROM crm_quotes`;
  const params: unknown[] = [];
  if (leadId) { sql += ` WHERE lead_id = $1`; params.push(leadId); }
  sql += ` ORDER BY updated_at DESC`;
  const rows = await query<{ data: Quote | string }>(sql, params);
  return rows.map(r => typeof r.data === "string" ? JSON.parse(r.data) : r.data);
}

export async function getQuote(id: string): Promise<Quote | null> {
  await initCrmSchema();
  const row = await queryOne<{ data: Quote | string }>(
    `SELECT data FROM crm_quotes WHERE id = $1`, [id]
  );
  if (!row) return null;
  return typeof row.data === "string" ? JSON.parse(row.data) : row.data;
}

export async function createQuote(input: Omit<Quote, "id" | "quoteNumber" | "createdAt" | "updatedAt">): Promise<Quote> {
  await initCrmSchema();
  const count = await queryOne<{ count: string | number }>(`SELECT COUNT(*) as count FROM crm_quotes`);
  const num = (parseInt(String(count?.count || "0")) + 1).toString().padStart(3, "0");
  const year = new Date().getFullYear();
  const now = new Date().toISOString();
  const quote: Quote = {
    ...input,
    id: randomUUID(),
    quoteNumber: `BG-${year}-${num}`,
    createdAt: now,
    updatedAt: now,
  };
  await query(
    `INSERT INTO crm_quotes (id, lead_id, data, updated_at) VALUES ($1, $2, $3, NOW())`,
    [quote.id, quote.leadId, JSON.stringify(quote)]
  );
  return quote;
}

export async function updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | null> {
  await initCrmSchema();
  const existing = await getQuote(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
  await query(
    `UPDATE crm_quotes SET data = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(updated), id]
  );
  return updated;
}

export async function deleteQuote(id: string): Promise<void> {
  await initCrmSchema();
  await query(`DELETE FROM crm_quotes WHERE id = $1`, [id]);
}

// ─── Tasks CRUD ───────────────────────────────────────────────────────────────

export async function getTasks(filters?: { leadId?: string; done?: boolean; dueToday?: boolean; assignedTo?: string }): Promise<CrmTask[]> {
  await initCrmSchema();
  let sql = `SELECT data FROM crm_tasks`;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.leadId) { conditions.push(`lead_id = $${idx++}`); params.push(filters.leadId); }
  if (filters?.done !== undefined) { conditions.push(`done = $${idx++}`); params.push(filters.done); }
  if (filters?.dueToday) {
    conditions.push(`due_date <= CURRENT_DATE AND done = FALSE`);
  }
  if (filters?.assignedTo) {
    // Nhân viên chỉ thấy tasks được giao đích danh cho mình
    conditions.push(`data->>'assignedTo' = $${idx++}`);
    params.push(filters.assignedTo);
  }

  if (conditions.length > 0) sql += ` WHERE ${conditions.join(" AND ")}`;
  sql += ` ORDER BY due_date ASC`;

  const rows = await query<{ data: CrmTask | string }>(sql, params);
  return rows.map(r => typeof r.data === "string" ? JSON.parse(r.data) : r.data);
}

export async function createTask(input: Omit<CrmTask, "id" | "createdAt">): Promise<CrmTask> {
  await initCrmSchema();
  const task: CrmTask = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  await query(
    `INSERT INTO crm_tasks (id, lead_id, data, due_date, done) VALUES ($1, $2, $3, $4, $5)`,
    [task.id, task.leadId, JSON.stringify(task), task.dueDate, task.done]
  );
  return task;
}

export async function updateTask(id: string, updates: Partial<CrmTask>): Promise<CrmTask | null> {
  await initCrmSchema();
  const rows = await query<{ data: CrmTask | string }>(`SELECT data FROM crm_tasks WHERE id = $1`, [id]);
  const raw = rows[0]?.data;
  const existing = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
  if (!existing) return null;
  const updated = { ...existing, ...updates, id };
  await query(
    `UPDATE crm_tasks SET data = $1, done = $2, due_date = $3, updated_at = NOW() WHERE id = $4`,
    [JSON.stringify(updated), updated.done, updated.dueDate, id]
  );
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  await initCrmSchema();
  await query(`DELETE FROM crm_tasks WHERE id = $1`, [id]);
}

// ─── CRM Stats ────────────────────────────────────────────────────────────────

export async function getCrmStats(staffFilter?: { assignedTo?: string }): Promise<CrmStats> {
  await initCrmSchema();

  const leads = await getLeads(staffFilter);
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const byStage: Record<string, number> = {};
  const bySourceMap: Record<string, { count: number; wonCount: number; totalValue: number }> = {};
  const byType: Record<string, number> = {};
  let totalExpectedValue = 0;
  let wonValue = 0;
  let overdueLeads = 0;

  for (const lead of leads) {
    byStage[lead.stage] = (byStage[lead.stage] || 0) + 1;
    if (!bySourceMap[lead.source]) bySourceMap[lead.source] = { count: 0, wonCount: 0, totalValue: 0 };
    bySourceMap[lead.source].count++;
    if (lead.stage === "won") bySourceMap[lead.source].wonCount++;
    bySourceMap[lead.source].totalValue += lead.expectedValue || 0;
    byType[lead.type] = (byType[lead.type] || 0) + 1;
    totalExpectedValue += lead.expectedValue || 0;
    if (lead.stage === "won") wonValue += lead.expectedValue || 0;
    if (
      lead.stage !== "won" &&
      lead.stage !== "lost" &&
      new Date(lead.lastContactAt) < threeDaysAgo
    ) {
      overdueLeads++;
    }
  }

  const bySource: CrmSourceStat[] = Object.entries(bySourceMap)
    .map(([source, s]) => ({ source, ...s }))
    .sort((a, b) => b.count - a.count);

  const wonCount = byStage["won"] || 0;
  const totalClosed = wonCount + (byStage["lost"] || 0);
  const conversionRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

  const todayTaskRows = await getTasks({ dueToday: true, ...(staffFilter?.assignedTo ? { assignedTo: staffFilter.assignedTo } : {}) });

  const activityRows = await query<{ data: Activity | string }>(
    `SELECT data FROM crm_activities ORDER BY created_at DESC LIMIT 10`
  );

  const staffMap: Record<string, { leadsCount: number; wonCount: number; wonValue: number }> = {};
  for (const lead of leads) {
    const name = lead.assignedTo || "Chưa phân công";
    if (!staffMap[name]) staffMap[name] = { leadsCount: 0, wonCount: 0, wonValue: 0 };
    staffMap[name].leadsCount++;
    if (lead.stage === "won") {
      staffMap[name].wonCount++;
      staffMap[name].wonValue += lead.expectedValue || 0;
    }
  }
  const staffPerformance: StaffPerformance[] = Object.entries(staffMap)
    .map(([staffName, s]) => ({
      staffName,
      leadsCount: s.leadsCount,
      wonCount: s.wonCount,
      wonValue: s.wonValue,
      conversionRate: s.leadsCount > 0 ? Math.round((s.wonCount / s.leadsCount) * 100) : 0,
    }))
    .sort((a, b) => b.wonValue - a.wonValue)
    .slice(0, 10);

  const monthlyMap: Record<string, number> = {};
  for (const lead of leads) {
    if (lead.stage === "won" && lead.expectedValue) {
      const d = new Date(lead.updatedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + lead.expectedValue;
    }
  }
  const monthlyRevenue: MonthlyRevenue[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenue.push({
      month: key,
      label: `Th ${d.getMonth() + 1}`,
      value: monthlyMap[key] || 0,
    });
  }

  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const newLeadsThisMonth = leads.filter(l => {
    const d = new Date(l.createdAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === thisMonthKey;
  }).length;
  const wonThisMonth = leads.filter(l => {
    if (l.stage !== "won") return false;
    const d = new Date(l.updatedAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === thisMonthKey;
  });

  return {
    totalLeads: leads.length,
    byStage: byStage as Record<LeadStage, number>,
    bySource,
    byType: byType as Record<LeadType, number>,
    totalExpectedValue,
    wonValue,
    conversionRate,
    overdueLeads,
    todayTasks: todayTaskRows.length,
    recentActivities: activityRows.map(r => typeof r.data === "string" ? JSON.parse(r.data) : r.data),
    staffPerformance,
    monthlyRevenue,
    newLeadsThisMonth,
    wonLeadsThisMonth: wonThisMonth.length,
    wonValueThisMonth: wonThisMonth.reduce((s, l) => s + (l.expectedValue || 0), 0),
  };
}
