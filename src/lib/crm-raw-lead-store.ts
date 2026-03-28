/**
 * crm-raw-lead-store.ts — Data Pool (Kho data tổng hợp chưa xử lý)
 * Nhận data từ Facebook Lead, TikTok Lead qua webhook
 * Logic FIFO: nhân viên lấy theo thứ tự vào trước lấy trước
 */
import { randomUUID } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────
export type RawLeadSource = "facebook_lead" | "tiktok_lead" | "manual" | "other";
export type RawLeadStatus = "pending" | "claimed" | "converted";

export interface RawLead {
  id: string;
  source: RawLeadSource;
  fullName: string;
  phone: string;
  email: string;
  adName?: string;         // Tên quảng cáo
  campaignName?: string;   // Tên chiến dịch
  formName?: string;       // Tên form lead
  message?: string;        // Nội dung/ghi chú từ form
  rawData?: Record<string, unknown>; // Toàn bộ data gốc từ webhook
  status: RawLeadStatus;
  claimedBy?: string;      // staffId đã nhận
  claimedByName?: string;  // tên nhân viên đã nhận
  claimedAt?: string;      // thời điểm nhận
  convertedLeadId?: string; // ID lead CRM sau khi convert
  createdAt: string;       // Thời điểm data vào hệ thống (dùng cho FIFO)
}

export const SOURCE_LABELS: Record<RawLeadSource, string> = {
  facebook_lead: "Facebook Lead",
  tiktok_lead: "TikTok Lead",
  manual: "Nhập tay",
  other: "Khác",
};

export const SOURCE_COLORS: Record<RawLeadSource, string> = {
  facebook_lead: "#1877F2",
  tiktok_lead: "#000000",
  manual: "#6b7280",
  other: "#9ca3af",
};

// ─── DB helpers ───────────────────────────────────────────────────────────────
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
export async function initRawLeadSchema(): Promise<void> {
  if (schemaInitialized) return;
  await query(`
    CREATE TABLE IF NOT EXISTS crm_raw_leads (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'manual',
      full_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      ad_name TEXT,
      campaign_name TEXT,
      form_name TEXT,
      message TEXT,
      raw_data JSONB,
      status TEXT NOT NULL DEFAULT 'pending',
      claimed_by TEXT,
      claimed_by_name TEXT,
      claimed_at TIMESTAMPTZ,
      converted_lead_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  try {
    await query(`CREATE INDEX IF NOT EXISTS idx_crm_raw_leads_status ON crm_raw_leads(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_crm_raw_leads_created ON crm_raw_leads(created_at ASC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_crm_raw_leads_source ON crm_raw_leads(source)`);
  } catch { /* already exists */ }
  schemaInitialized = true;
  console.log("[crm] Raw leads schema initialized");
}

// ─── Row mapper ───────────────────────────────────────────────────────────────
function mapRow(row: Record<string, unknown>): RawLead {
  return {
    id: row.id as string,
    source: (row.source as RawLeadSource) || "manual",
    fullName: (row.full_name as string) || "",
    phone: (row.phone as string) || "",
    email: (row.email as string) || "",
    adName: (row.ad_name as string) || undefined,
    campaignName: (row.campaign_name as string) || undefined,
    formName: (row.form_name as string) || undefined,
    message: (row.message as string) || undefined,
    rawData: (row.raw_data as Record<string, unknown>) || undefined,
    status: (row.status as RawLeadStatus) || "pending",
    claimedBy: (row.claimed_by as string) || undefined,
    claimedByName: (row.claimed_by_name as string) || undefined,
    claimedAt: row.claimed_at ? new Date(row.claimed_at as string).toISOString() : undefined,
    convertedLeadId: (row.converted_lead_id as string) || undefined,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Tạo raw lead mới (từ webhook hoặc nhập tay) */
export async function createRawLead(data: Partial<RawLead>): Promise<RawLead> {
  await initRawLeadSchema();
  const id = data.id || randomUUID();
  const now = new Date().toISOString();
  await query(
    `INSERT INTO crm_raw_leads
      (id, source, full_name, phone, email, ad_name, campaign_name, form_name, message, raw_data, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11)
     ON CONFLICT (id) DO NOTHING`,
    [
      id,
      data.source || "manual",
      data.fullName || "",
      data.phone || "",
      data.email || "",
      data.adName || null,
      data.campaignName || null,
      data.formName || null,
      data.message || null,
      data.rawData ? JSON.stringify(data.rawData) : null,
      data.createdAt || now,
    ]
  );
  const row = await queryOne<Record<string, unknown>>(
    "SELECT * FROM crm_raw_leads WHERE id = $1", [id]
  );
  return mapRow(row!);
}

/** Lấy danh sách raw leads với filter */
export async function getRawLeads(filters?: {
  status?: RawLeadStatus;
  source?: RawLeadSource;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: RawLead[]; total: number }> {
  await initRawLeadSchema();
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (filters?.status) {
    conditions.push(`status = $${i++}`);
    params.push(filters.status);
  }
  if (filters?.source) {
    conditions.push(`source = $${i++}`);
    params.push(filters.source);
  }
  if (filters?.search) {
    conditions.push(`(full_name ILIKE $${i} OR phone ILIKE $${i} OR email ILIKE $${i})`);
    params.push(`%${filters.search}%`);
    i++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM crm_raw_leads ${where}`,
    params
  );
  const total = parseInt(countRows[0]?.count || "0", 10);

  // Fetch with FIFO order (created_at ASC = vào trước ra trước)
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM crm_raw_leads ${where} ORDER BY created_at ASC LIMIT $${i} OFFSET $${i + 1}`,
    [...params, limit, offset]
  );
  
  console.log('[getRawLeads] Query:', {
    where,
    params,
    limit,
    offset,
    total,
    rowsCount: rows.length,
  });

  return { items: rows.map(mapRow), total };
}

/** Lấy raw lead theo ID */
export async function getRawLeadById(id: string): Promise<RawLead | null> {
  await initRawLeadSchema();
  const row = await queryOne<Record<string, unknown>>(
    "SELECT * FROM crm_raw_leads WHERE id = $1", [id]
  );
  return row ? mapRow(row) : null;
}

/**
 * Nhân viên nhận data (claim) — FIFO enforcement:
 * Chỉ cho phép nhận nếu không có lead pending nào cũ hơn mà chưa được nhận.
 * Tức là phải nhận theo thứ tự created_at ASC.
 */
export async function claimRawLead(
  id: string,
  staffId: string,
  staffName: string
): Promise<{ success: boolean; error?: string; lead?: RawLead }> {
  await initRawLeadSchema();

  // Lấy lead cần claim
  const lead = await getRawLeadById(id);
  if (!lead) return { success: false, error: "Không tìm thấy data" };
  if (lead.status !== "pending") return { success: false, error: "Data này đã được nhận rồi" };

  // FIFO check: kiểm tra có lead pending nào cũ hơn không
  const olderPending = await queryOne<{ id: string }>(
    `SELECT id FROM crm_raw_leads
     WHERE status = 'pending' AND created_at < $1
     ORDER BY created_at ASC LIMIT 1`,
    [lead.createdAt]
  );
  if (olderPending) {
    return {
      success: false,
      error: "Bạn phải nhận data theo thứ tự. Có data cũ hơn chưa được nhận — hãy nhận data đó trước."
    };
  }

  // Claim
  const now = new Date().toISOString();
  await query(
    `UPDATE crm_raw_leads
     SET status = 'claimed', claimed_by = $1, claimed_by_name = $2, claimed_at = $3
     WHERE id = $4 AND status = 'pending'`,
    [staffId, staffName, now, id]
  );

  const updated = await getRawLeadById(id);
  if (!updated || updated.status !== "claimed") {
    return { success: false, error: "Có xung đột — data đã được người khác nhận" };
  }
  return { success: true, lead: updated };
}

/**
 * Admin phân data cho nhân viên cụ thể (bỏ qua FIFO)
 */
export async function assignRawLead(
  id: string,
  staffId: string,
  staffName: string
): Promise<{ success: boolean; error?: string; lead?: RawLead }> {
  await initRawLeadSchema();
  const lead = await getRawLeadById(id);
  if (!lead) return { success: false, error: "Không tìm thấy data" };
  if (lead.status !== "pending") return { success: false, error: "Data này đã được nhận rồi" };

  const now = new Date().toISOString();
  await query(
    `UPDATE crm_raw_leads
     SET status = 'claimed', claimed_by = $1, claimed_by_name = $2, claimed_at = $3
     WHERE id = $4`,
    [staffId, staffName, now, id]
  );

  const updated = await getRawLeadById(id);
  return { success: true, lead: updated! };
}

/**
 * Convert raw lead thành CRM lead chính thức
 */
export async function convertRawLead(id: string, crmLeadId: string): Promise<void> {
  await initRawLeadSchema();
  await query(
    `UPDATE crm_raw_leads SET status = 'converted', converted_lead_id = $1 WHERE id = $2`,
    [crmLeadId, id]
  );
}

/** Xóa raw lead (admin only) */
export async function deleteRawLead(id: string): Promise<void> {
  await initRawLeadSchema();
  await query("DELETE FROM crm_raw_leads WHERE id = $1", [id]);
}

/** Stats tổng hợp */
export async function getRawLeadStats(): Promise<{
  pending: number;
  claimed: number;
  converted: number;
  total: number;
  bySource: { source: string; count: number }[];
}> {
  await initRawLeadSchema();
  const rows = await query<{ status: string; count: string }>(
    "SELECT status, COUNT(*) as count FROM crm_raw_leads GROUP BY status"
  );
  const sourceRows = await query<{ source: string; count: string }>(
    "SELECT source, COUNT(*) as count FROM crm_raw_leads WHERE status = 'pending' GROUP BY source ORDER BY count DESC"
  );

  const byStatus: Record<string, number> = {};
  rows.forEach(r => { byStatus[r.status] = parseInt(r.count, 10); });

  return {
    pending: byStatus.pending || 0,
    claimed: byStatus.claimed || 0,
    converted: byStatus.converted || 0,
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    bySource: sourceRows.map(r => ({ source: r.source, count: parseInt(r.count, 10) })),
  };
}
