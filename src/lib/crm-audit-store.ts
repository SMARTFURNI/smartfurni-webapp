import { getDb } from "./db";

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditAction =
  | "lead.created" | "lead.updated" | "lead.deleted" | "lead.stage_changed"
  | "quote.created" | "quote.updated" | "quote.sent" | "quote.approved"
  | "activity.created" | "activity.deleted"
  | "task.created" | "task.completed" | "task.deleted"
  | "staff.created" | "staff.updated" | "staff.deleted"
  | "settings.updated"
  | "auth.login" | "auth.logout" | "auth.failed"
  | "data.exported" | "data.imported"
  | "apikey.created" | "apikey.revoked";

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: string;         // "lead" | "quote" | "staff" | ...
  entityId: string | null;
  entityName: string | null;  // human-readable name
  actorId: string | null;     // staff id or "system"
  actorName: string;
  ipAddress: string | null;
  changes: Record<string, { before: unknown; after: unknown }> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogFilter {
  action?: AuditAction;
  entityType?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export type ApiKeyPermission =
  | "leads:read" | "leads:write"
  | "quotes:read" | "quotes:write"
  | "activities:read" | "activities:write"
  | "webhook:receive"
  | "reports:read"
  | "settings:read";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;          // first 8 chars shown in UI
  keyHash: string;            // SHA-256 hash stored
  permissions: ApiKeyPermission[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
}

// ─── Permission Matrix ────────────────────────────────────────────────────────

export type StaffRole = "admin" | "manager" | "sales" | "viewer";

export interface PermissionSet {
  role: StaffRole;
  label: string;
  color: string;
  permissions: {
    // Leads
    leads_view_all: boolean;
    leads_view_own: boolean;
    leads_create: boolean;
    leads_edit: boolean;
    leads_delete: boolean;
    leads_export: boolean;
    // Quotes
    quotes_view_all: boolean;
    quotes_create: boolean;
    quotes_approve: boolean;
    // Reports
    reports_view: boolean;
    reports_export: boolean;
    // Staff
    staff_manage: boolean;
    // Settings
    settings_view: boolean;
    settings_edit: boolean;
    // Data
    data_import: boolean;
    data_export: boolean;
  };
}

export const DEFAULT_PERMISSION_MATRIX: PermissionSet[] = [
  {
    role: "admin",
    label: "Quản trị viên",
    color: "#C9A84C",
    permissions: {
      leads_view_all: true, leads_view_own: true, leads_create: true,
      leads_edit: true, leads_delete: true, leads_export: true,
      quotes_view_all: true, quotes_create: true, quotes_approve: true,
      reports_view: true, reports_export: true,
      staff_manage: true,
      settings_view: true, settings_edit: true,
      data_import: true, data_export: true,
    },
  },
  {
    role: "manager",
    label: "Quản lý",
    color: "#60a5fa",
    permissions: {
      leads_view_all: true, leads_view_own: true, leads_create: true,
      leads_edit: true, leads_delete: false, leads_export: true,
      quotes_view_all: true, quotes_create: true, quotes_approve: true,
      reports_view: true, reports_export: true,
      staff_manage: false,
      settings_view: true, settings_edit: false,
      data_import: false, data_export: true,
    },
  },
  {
    role: "sales",
    label: "Sales",
    color: "#22c55e",
    permissions: {
      leads_view_all: false, leads_view_own: true, leads_create: true,
      leads_edit: true, leads_delete: false, leads_export: false,
      quotes_view_all: false, quotes_create: true, quotes_approve: false,
      reports_view: false, reports_export: false,
      staff_manage: false,
      settings_view: false, settings_edit: false,
      data_import: false, data_export: false,
    },
  },
  {
    role: "viewer",
    label: "Xem báo cáo",
    color: "#94a3b8",
    permissions: {
      leads_view_all: true, leads_view_own: true, leads_create: false,
      leads_edit: false, leads_delete: false, leads_export: false,
      quotes_view_all: true, quotes_create: false, quotes_approve: false,
      reports_view: true, reports_export: true,
      staff_manage: false,
      settings_view: false, settings_edit: false,
      data_import: false, data_export: false,
    },
  },
];

export const PERMISSION_LABELS: Record<keyof PermissionSet["permissions"], string> = {
  leads_view_all: "Xem tất cả KH",
  leads_view_own: "Xem KH của mình",
  leads_create: "Tạo KH mới",
  leads_edit: "Sửa thông tin KH",
  leads_delete: "Xóa KH",
  leads_export: "Xuất danh sách KH",
  quotes_view_all: "Xem tất cả báo giá",
  quotes_create: "Tạo báo giá",
  quotes_approve: "Duyệt báo giá",
  reports_view: "Xem báo cáo",
  reports_export: "Xuất báo cáo",
  staff_manage: "Quản lý nhân viên",
  settings_view: "Xem cài đặt",
  settings_edit: "Sửa cài đặt",
  data_import: "Import dữ liệu",
  data_export: "Export dữ liệu",
};

export const PERMISSION_GROUPS: { label: string; keys: (keyof PermissionSet["permissions"])[] }[] = [
  { label: "Khách hàng", keys: ["leads_view_all", "leads_view_own", "leads_create", "leads_edit", "leads_delete", "leads_export"] },
  { label: "Báo giá", keys: ["quotes_view_all", "quotes_create", "quotes_approve"] },
  { label: "Báo cáo", keys: ["reports_view", "reports_export"] },
  { label: "Quản trị", keys: ["staff_manage", "settings_view", "settings_edit", "data_import", "data_export"] },
];

// ─── Store Functions ──────────────────────────────────────────────────────────

async function ensureTables(db: ReturnType<typeof getDb>) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      entity_name TEXT,
      actor_id TEXT,
      actor_name TEXT NOT NULL,
      ip_address TEXT,
      changes JSONB,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      permissions JSONB NOT NULL DEFAULT '[]',
      last_used_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      enabled BOOLEAN DEFAULT TRUE,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_permission_matrix (
      role TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// Audit Log CRUD
export async function addAuditLog(log: Omit<AuditLog, "id" | "createdAt">): Promise<void> {
  try {
    const db = getDb();
    await ensureTables(db);
    const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.query(
      `INSERT INTO crm_audit_logs
       (id, action, entity_type, entity_id, entity_name, actor_id, actor_name, ip_address, changes, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, log.action, log.entityType, log.entityId, log.entityName,
       log.actorId, log.actorName, log.ipAddress,
       log.changes ? JSON.stringify(log.changes) : null,
       log.metadata ? JSON.stringify(log.metadata) : null]
    );
  } catch {
    // Non-blocking — audit log failure should not break main flow
  }
}

export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<{ logs: AuditLog[]; total: number }> {
  try {
    const db = getDb();
    await ensureTables(db);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filter.action) { conditions.push(`action = $${idx++}`); params.push(filter.action); }
    if (filter.entityType) { conditions.push(`entity_type = $${idx++}`); params.push(filter.entityType); }
    if (filter.actorId) { conditions.push(`actor_id = $${idx++}`); params.push(filter.actorId); }
    if (filter.dateFrom) { conditions.push(`created_at >= $${idx++}`); params.push(filter.dateFrom); }
    if (filter.dateTo) { conditions.push(`created_at <= $${idx++}`); params.push(filter.dateTo); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRes = await db.query(`SELECT COUNT(*) FROM crm_audit_logs ${where}`, params);
    const total = parseInt(countRes.rows[0].count);
    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    const res = await db.query(
      `SELECT * FROM crm_audit_logs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    const logs: AuditLog[] = res.rows.map(r => ({
      id: r.id, action: r.action, entityType: r.entity_type, entityId: r.entity_id,
      entityName: r.entity_name, actorId: r.actor_id, actorName: r.actor_name,
      ipAddress: r.ip_address, changes: r.changes, metadata: r.metadata,
      createdAt: r.created_at,
    }));
    return { logs, total };
  } catch {
    return { logs: [], total: 0 };
  }
}

// API Keys CRUD
export async function getApiKeys(): Promise<ApiKey[]> {
  try {
    const db = getDb();
    await ensureTables(db);
    const res = await db.query(`SELECT * FROM crm_api_keys ORDER BY created_at DESC`);
    return res.rows.map(r => ({
      id: r.id, name: r.name, keyPrefix: r.key_prefix, keyHash: r.key_hash,
      permissions: r.permissions, lastUsedAt: r.last_used_at, expiresAt: r.expires_at,
      enabled: r.enabled, createdBy: r.created_by, createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

export async function createApiKey(name: string, permissions: ApiKeyPermission[], expiresAt: string | null, createdBy: string): Promise<{ key: ApiKey; rawKey: string }> {
  const db = getDb();
  await ensureTables(db);
  const id = `ak_${Date.now()}`;
  const raw = `sf_${Array.from({ length: 40 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]).join("")}`;
  const prefix = raw.slice(0, 10);
  // Simple hash (in production use crypto.subtle or bcrypt)
  const hash = Buffer.from(raw).toString("base64");
  await db.query(
    `INSERT INTO crm_api_keys (id, name, key_prefix, key_hash, permissions, expires_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, name, prefix, hash, JSON.stringify(permissions), expiresAt, createdBy]
  );
  const key: ApiKey = {
    id, name, keyPrefix: prefix, keyHash: hash, permissions,
    lastUsedAt: null, expiresAt, enabled: true, createdBy, createdAt: new Date().toISOString(),
  };
  return { key, rawKey: raw };
}

export async function revokeApiKey(id: string): Promise<void> {
  const db = getDb();
  await db.query(`UPDATE crm_api_keys SET enabled = FALSE WHERE id = $1`, [id]);
}

export async function deleteApiKey(id: string): Promise<void> {
  const db = getDb();
  await db.query(`DELETE FROM crm_api_keys WHERE id = $1`, [id]);
}

// Permission Matrix
export async function getPermissionMatrix(): Promise<PermissionSet[]> {
  try {
    const db = getDb();
    await ensureTables(db);
    const res = await db.query(`SELECT * FROM crm_permission_matrix ORDER BY role`);
    if (res.rows.length === 0) return DEFAULT_PERMISSION_MATRIX;
    return res.rows.map(r => r.data as PermissionSet);
  } catch {
    return DEFAULT_PERMISSION_MATRIX;
  }
}

export async function savePermissionMatrix(matrix: PermissionSet[]): Promise<void> {
  const db = getDb();
  await ensureTables(db);
  for (const ps of matrix) {
    await db.query(
      `INSERT INTO crm_permission_matrix (role, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (role) DO UPDATE SET data = $2, updated_at = NOW()`,
      [ps.role, JSON.stringify(ps)]
    );
  }
}
