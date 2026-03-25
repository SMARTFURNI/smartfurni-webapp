/**
 * crm-store.ts — SmartFurni CRM B2B
 * Quản lý Leads, Activities, Products, Quotes, Tasks
 * PostgreSQL persistence via pg Pool
 */

import { query, queryOne } from "./db";
import { randomUUID } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeadStage =
  | "new"           // Khách hàng mới
  | "profile_sent"  // Đã gửi Profile
  | "surveyed"      // Đã khảo sát
  | "quoted"        // Đã báo giá
  | "negotiating"   // Thương thảo
  | "won"           // Đã chốt
  | "lost";         // Thất bại

export type LeadType = "architect" | "investor" | "dealer";

export type ActivityType = "call" | "meeting" | "email" | "note" | "quote_sent" | "contract";

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  type: LeadType;
  stage: LeadStage;
  district: string;         // Q1, Q2, Q7, Bình Thạnh...
  expectedValue: number;    // VND
  source: string;           // Facebook Ads, KTS giới thiệu, Zalo...
  assignedTo: string;       // Tên sales phụ trách
  notes: string;
  lastContactAt: string;    // ISO date
  createdAt: string;
  updatedAt: string;
  tags: string[];
  projectName: string;      // Tên dự án
  projectAddress: string;
  unitCount: number;        // Số căn / số phòng
  lostReason?: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  scheduledAt?: string;     // Lịch hẹn
  attachments: ActivityAttachment[];
}

export interface ActivityAttachment {
  name: string;
  url: string;
  type: string; // "pdf" | "image" | "doc"
  size: number;
}

export interface CrmProduct {
  id: string;
  name: string;
  category: "sofa_bed" | "ergonomic_bed";
  sku: string;
  description: string;
  imageUrl: string;
  specs: Record<string, string>;  // Thông số kỹ thuật
  basePrice: number;              // Giá gốc VND
  discountTiers: DiscountTier[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountTier {
  minQty: number;
  discountPct: number;  // 0-100
  label: string;        // "≥10 bộ: -15%"
}

export interface QuoteItem {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  finalPrice: number;
  notes: string;
}

export interface Quote {
  id: string;
  leadId: string;
  leadName: string;
  quoteNumber: string;    // BG-2025-001
  items: QuoteItem[];
  subtotal: number;
  extraDiscountPct: number;
  total: number;
  validUntil: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmTask {
  id: string;
  leadId: string;
  leadName: string;
  title: string;
  dueDate: string;        // ISO date
  priority: "high" | "medium" | "low";
  done: boolean;
  assignedTo: string;
  createdAt: string;
}

// ─── Schema Init ──────────────────────────────────────────────────────────────

export async function initCrmSchema(): Promise<void> {
  const db = (await import("./db")).getDb();

  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_leads (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      stage TEXT NOT NULL DEFAULT 'new',
      last_contact_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_products (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_quotes (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_tasks (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      data JSONB NOT NULL,
      due_date DATE,
      done BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Index for performance
  await db.query(`CREATE INDEX IF NOT EXISTS idx_crm_activities_lead ON crm_activities(lead_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_crm_quotes_lead ON crm_quotes(lead_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead ON crm_tasks(lead_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_crm_tasks_due ON crm_tasks(due_date)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON crm_leads(stage)`);

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

  const rows = await query<{ data: Lead }>(sql, params);
  return rows.map(r => r.data);
}

export async function getLead(id: string): Promise<Lead | null> {
  await initCrmSchema();
  const row = await queryOne<{ data: Lead }>(
    `SELECT data FROM crm_leads WHERE id = $1`, [id]
  );
  return row?.data ?? null;
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
    `INSERT INTO crm_leads (id, data, stage, last_contact_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW())`,
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
    `UPDATE crm_leads SET data = $2, stage = $3, last_contact_at = $4, updated_at = NOW() WHERE id = $1`,
    [id, JSON.stringify(updated), updated.stage, updated.lastContactAt]
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
  const rows = await query<{ data: Activity }>(
    `SELECT data FROM crm_activities WHERE lead_id = $1 ORDER BY created_at DESC`,
    [leadId]
  );
  return rows.map(r => r.data);
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
  // Update lead's lastContactAt
  await query(
    `UPDATE crm_leads SET data = jsonb_set(data, '{lastContactAt}', $2::jsonb), last_contact_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [activity.leadId, JSON.stringify(activity.createdAt)]
  );
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
  const rows = await query<{ data: CrmProduct }>(sql);
  return rows.map(r => r.data);
}

export async function getCrmProduct(id: string): Promise<CrmProduct | null> {
  await initCrmSchema();
  const row = await queryOne<{ data: CrmProduct }>(
    `SELECT data FROM crm_products WHERE id = $1`, [id]
  );
  return row?.data ?? null;
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
  const rows = await query<{ data: Quote }>(sql, params);
  return rows.map(r => r.data);
}

export async function getQuote(id: string): Promise<Quote | null> {
  await initCrmSchema();
  const row = await queryOne<{ data: Quote }>(
    `SELECT data FROM crm_quotes WHERE id = $1`, [id]
  );
  return row?.data ?? null;
}

export async function createQuote(input: Omit<Quote, "id" | "quoteNumber" | "createdAt" | "updatedAt">): Promise<Quote> {
  await initCrmSchema();
  // Generate quote number
  const count = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM crm_quotes`);
  const num = (parseInt(count?.count || "0") + 1).toString().padStart(3, "0");
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
    `UPDATE crm_quotes SET data = $2, updated_at = NOW() WHERE id = $1`,
    [id, JSON.stringify(updated)]
  );
  return updated;
}

export async function deleteQuote(id: string): Promise<void> {
  await initCrmSchema();
  await query(`DELETE FROM crm_quotes WHERE id = $1`, [id]);
}

// ─── Tasks CRUD ───────────────────────────────────────────────────────────────

export async function getTasks(filters?: { leadId?: string; done?: boolean; dueToday?: boolean }): Promise<CrmTask[]> {
  await initCrmSchema();
  let sql = `SELECT data FROM crm_tasks`;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.leadId) { conditions.push(`lead_id = $${idx++}`); params.push(filters.leadId); }
  if (filters?.done !== undefined) { conditions.push(`done = $${idx++}`); params.push(filters.done); }
  if (filters?.dueToday) {
    conditions.push(`due_date <= CURRENT_DATE AND done = false`);
  }

  if (conditions.length > 0) sql += ` WHERE ${conditions.join(" AND ")}`;
  sql += ` ORDER BY due_date ASC`;

  const rows = await query<{ data: CrmTask }>(sql, params);
  return rows.map(r => r.data);
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
  const rows = await query<{ data: CrmTask }>(`SELECT data FROM crm_tasks WHERE id = $1`, [id]);
  const existing = rows[0]?.data;
  if (!existing) return null;
  const updated = { ...existing, ...updates, id };
  await query(
    `UPDATE crm_tasks SET data = $2, done = $3, due_date = $4, updated_at = NOW() WHERE id = $1`,
    [id, JSON.stringify(updated), updated.done, updated.dueDate]
  );
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  await initCrmSchema();
  await query(`DELETE FROM crm_tasks WHERE id = $1`, [id]);
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface CrmSourceStat {
  source: string;
  count: number;
  wonCount: number;
  totalValue: number;
}

export interface CrmStats {
  totalLeads: number;
  byStage: Record<LeadStage, number>;
  bySource: CrmSourceStat[];
  byType: Record<LeadType, number>;
  totalExpectedValue: number;
  wonValue: number;
  conversionRate: number;
  overdueLeads: number;       // Không tương tác >3 ngày
  todayTasks: number;
  recentActivities: Activity[];
}

export async function getCrmStats(): Promise<CrmStats> {
  await initCrmSchema();

  const leads = await getLeads();
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

  const todayTaskRows = await getTasks({ dueToday: true });

  const activityRows = await query<{ data: Activity }>(
    `SELECT data FROM crm_activities ORDER BY created_at DESC LIMIT 10`
  );

  return {
    totalLeads: leads.length,
    byStage: byStage as Record<LeadStage, number>,
    bySource: bySource,
    byType: byType as Record<LeadType, number>,
    totalExpectedValue,
    wonValue,
    conversionRate,
    overdueLeads,
    todayTasks: todayTaskRows.length,
    recentActivities: activityRows.map(r => r.data),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: "Khách hàng mới",
  profile_sent: "Đã gửi Profile",
  surveyed: "Đã khảo sát",
  quoted: "Đã báo giá",
  negotiating: "Thương thảo",
  won: "Đã chốt ✓",
  lost: "Thất bại",
};

export const STAGE_COLORS: Record<LeadStage, string> = {
  new: "#6366f1",
  profile_sent: "#3b82f6",
  surveyed: "#8b5cf6",
  quoted: "#f59e0b",
  negotiating: "#f97316",
  won: "#22c55e",
  lost: "#6b7280",
};

export const TYPE_LABELS: Record<LeadType, string> = {
  architect: "Kiến trúc sư",
  investor: "Chủ đầu tư CHDV",
  dealer: "Đại lý",
};

export const TYPE_COLORS: Record<LeadType, string> = {
  architect: "#8b5cf6",
  investor: "#3b82f6",
  dealer: "#f59e0b",
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  call: "Gọi điện",
  meeting: "Họp / Gặp mặt",
  email: "Gửi email",
  note: "Ghi chú",
  quote_sent: "Gửi báo giá",
  contract: "Hợp đồng",
};

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  call: "phone",
  meeting: "users",
  email: "mail",
  note: "file-text",
  quote_sent: "file-check",
  contract: "file-signature",
};

export const DISTRICTS = [
  "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10",
  "Q11", "Q12", "Bình Thạnh", "Gò Vấp", "Phú Nhuận", "Tân Bình",
  "Tân Phú", "Bình Tân", "Thủ Đức", "Hóc Môn", "Củ Chi", "Bình Chánh",
  "Nhà Bè", "Cần Giờ", "Hà Nội", "Đà Nẵng", "Khác",
];

export const SOURCES = [
  "Facebook Ads", "Google Ads", "KTS giới thiệu", "Khách hàng cũ giới thiệu",
  "Zalo", "Website", "Triển lãm", "Telesale", "Khác",
];

export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export function isOverdue(lead: Lead): boolean {
  if (lead.stage === "won" || lead.stage === "lost") return false;
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  return new Date(lead.lastContactAt) < threeDaysAgo;
}

export function calcQuoteTotal(items: QuoteItem[], extraDiscountPct: number): number {
  const subtotal = items.reduce((sum, item) => sum + item.finalPrice * item.qty, 0);
  return subtotal * (1 - extraDiscountPct / 100);
}

export function getDiscountForQty(product: CrmProduct, qty: number): number {
  const tiers = [...product.discountTiers].sort((a, b) => b.minQty - a.minQty);
  for (const tier of tiers) {
    if (qty >= tier.minQty) return tier.discountPct;
  }
  return 0;
}
