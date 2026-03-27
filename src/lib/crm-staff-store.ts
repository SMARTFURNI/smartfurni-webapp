/**
 * crm-staff-store.ts — SmartFurni CRM Staff Management
 * Quản lý tài khoản nhân viên, cấp bậc, phân quyền
 */

import { query, queryOne, getDb } from "./db";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StaffRole =
  | "super_admin"   // Quản trị tối cao (chủ doanh nghiệp)
  | "manager"       // Trưởng nhóm / Quản lý
  | "senior_sales"  // Sales cao cấp
  | "sales"         // Sales thông thường
  | "intern";       // Thực tập sinh

export type StaffStatus = "active" | "inactive" | "suspended";

export interface StaffPermissions {
  // Leads
  canViewAllLeads: boolean;       // Xem tất cả KH (không chỉ của mình)
  canCreateLead: boolean;
  canEditLead: boolean;
  canDeleteLead: boolean;
  canAssignLead: boolean;         // Phân công KH cho người khác
  canMovePipeline: boolean;       // Di chuyển giai đoạn pipeline

  // Quotes
  canCreateQuote: boolean;
  canApproveQuote: boolean;       // Duyệt báo giá
  canGiveExtraDiscount: boolean;  // Chiết khấu thêm ngoài bảng giá

  // Reports
  canViewReports: boolean;        // Xem báo cáo tổng hợp
  canViewOthersRevenue: boolean;  // Xem doanh số của người khác

  // Staff
  canManageStaff: boolean;        // Quản lý nhân viên

  // Products
  canEditProducts: boolean;       // Chỉnh sửa sản phẩm/giá
}

export interface StaffMember {
  id: string;
  username: string;         // Tên đăng nhập
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  permissions: StaffPermissions;
  assignedDistricts: string[];  // Khu vực phụ trách
  targetRevenue: number;        // Doanh số mục tiêu tháng (VND)
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

// ─── Role Defaults ────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin:  "Quản trị viên",
  manager:      "Trưởng nhóm",
  senior_sales: "Sales cao cấp",
  sales:        "Sales",
  intern:       "Thực tập sinh",
};

export const ROLE_COLORS: Record<StaffRole, string> = {
  super_admin:  "#C9A84C",
  manager:      "#8b5cf6",
  senior_sales: "#3b82f6",
  sales:        "#22c55e",
  intern:       "#6b7280",
};

export const DEFAULT_PERMISSIONS: Record<StaffRole, StaffPermissions> = {
  super_admin: {
    canViewAllLeads: true,
    canCreateLead: true,
    canEditLead: true,
    canDeleteLead: true,
    canAssignLead: true,
    canMovePipeline: true,
    canCreateQuote: true,
    canApproveQuote: true,
    canGiveExtraDiscount: true,
    canViewReports: true,
    canViewOthersRevenue: true,
    canManageStaff: true,
    canEditProducts: true,
  },
  manager: {
    canViewAllLeads: true,
    canCreateLead: true,
    canEditLead: true,
    canDeleteLead: false,
    canAssignLead: true,
    canMovePipeline: true,
    canCreateQuote: true,
    canApproveQuote: true,
    canGiveExtraDiscount: true,
    canViewReports: true,
    canViewOthersRevenue: true,
    canManageStaff: false,
    canEditProducts: false,
  },
  senior_sales: {
    canViewAllLeads: false,
    canCreateLead: true,
    canEditLead: true,
    canDeleteLead: false,
    canAssignLead: false,
    canMovePipeline: true,
    canCreateQuote: true,
    canApproveQuote: false,
    canGiveExtraDiscount: false,
    canViewReports: true,
    canViewOthersRevenue: false,
    canManageStaff: false,
    canEditProducts: false,
  },
  sales: {
    canViewAllLeads: false,
    canCreateLead: true,
    canEditLead: true,
    canDeleteLead: false,
    canAssignLead: false,
    canMovePipeline: true,
    canCreateQuote: true,
    canApproveQuote: false,
    canGiveExtraDiscount: false,
    canViewReports: false,
    canViewOthersRevenue: false,
    canManageStaff: false,
    canEditProducts: false,
  },
  intern: {
    canViewAllLeads: false,
    canCreateLead: true,
    canEditLead: false,
    canDeleteLead: false,
    canAssignLead: false,
    canMovePipeline: false,
    canCreateQuote: false,
    canApproveQuote: false,
    canGiveExtraDiscount: false,
    canViewReports: false,
    canViewOthersRevenue: false,
    canManageStaff: false,
    canEditProducts: false,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "smartfurni_salt_2025").digest("hex");
}

// ─── Schema Init ──────────────────────────────────────────────────────────────

export async function initStaffSchema(): Promise<void> {
  const db = getDb();

  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_staff (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      data JSONB NOT NULL,
      role TEXT NOT NULL DEFAULT 'sales',
      status TEXT NOT NULL DEFAULT 'active',
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_staff_sessions (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Tạo tài khoản super_admin mặc định nếu chưa có
  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM crm_staff WHERE role = 'super_admin' LIMIT 1"
  );
  if (!existing) {
    const defaultAdmin: StaffMember = {
      id: randomUUID(),
      username: "admin",
      fullName: "Quản trị viên",
      email: "admin@smartfurni.vn",
      phone: "0900000000",
      role: "super_admin",
      status: "active",
      permissions: DEFAULT_PERMISSIONS.super_admin,
      assignedDistricts: [],
      targetRevenue: 0,
      avatarUrl: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null,
    };
    await db.query(
      `INSERT INTO crm_staff (id, username, password_hash, data, role, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [defaultAdmin.id, "admin", hashPassword("smartfurni2026"),
       JSON.stringify(defaultAdmin), "super_admin", "active"]
    );
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getAllStaff(): Promise<StaffMember[]> {
  await initStaffSchema();
  const rows = await query<{ data: StaffMember; last_login_at: string | null }>(
    "SELECT data, last_login_at FROM crm_staff ORDER BY created_at ASC"
  );
  return rows.map(r => ({ ...r.data, lastLoginAt: r.last_login_at }));
}

export async function getStaffById(id: string): Promise<StaffMember | null> {
  await initStaffSchema();
  const row = await queryOne<{ data: StaffMember; last_login_at: string | null }>(
    "SELECT data, last_login_at FROM crm_staff WHERE id = $1", [id]
  );
  if (!row) return null;
  return { ...row.data, lastLoginAt: row.last_login_at };
}

export async function getStaffByUsername(username: string): Promise<StaffMember | null> {
  await initStaffSchema();
  const row = await queryOne<{ data: StaffMember; last_login_at: string | null }>(
    "SELECT data, last_login_at FROM crm_staff WHERE username = $1", [username]
  );
  if (!row) return null;
  return { ...row.data, lastLoginAt: row.last_login_at };
}

export async function createStaff(input: {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  assignedDistricts?: string[];
  targetRevenue?: number;
}): Promise<StaffMember> {
  await initStaffSchema();
  const id = randomUUID();
  const now = new Date().toISOString();
  const staff: StaffMember = {
    id,
    username: input.username,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    role: input.role,
    status: "active",
    permissions: { ...DEFAULT_PERMISSIONS[input.role] },
    assignedDistricts: input.assignedDistricts || [],
    targetRevenue: input.targetRevenue || 0,
    avatarUrl: "",
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
  await query(
    `INSERT INTO crm_staff (id, username, password_hash, data, role, status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, input.username, hashPassword(input.password),
     JSON.stringify(staff), input.role, "active"]
  );
  return staff;
}

export async function updateStaff(id: string, updates: Partial<StaffMember>): Promise<StaffMember | null> {
  const existing = await getStaffById(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await query(
    `UPDATE crm_staff SET data = $1, role = $2, status = $3, updated_at = NOW() WHERE id = $4`,
    [JSON.stringify(updated), updated.role, updated.status, id]
  );
  return updated;
}

export async function updateStaffPassword(id: string, newPassword: string): Promise<void> {
  await query(
    `UPDATE crm_staff SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [hashPassword(newPassword), id]
  );
}

export async function deleteStaff(id: string): Promise<void> {
  await query("DELETE FROM crm_staff WHERE id = $1", [id]);
}

// ─── Authentication ───────────────────────────────────────────────────────────

export async function authenticateStaff(username: string, password: string): Promise<StaffMember | null> {
  await initStaffSchema();
  const row = await queryOne<{ id: string; data: StaffMember; status: string }>(
    `SELECT id, data, status FROM crm_staff WHERE username = $1 AND password_hash = $2`,
    [username, hashPassword(password)]
  );
  if (!row || row.status !== "active") return null;

  // Update last login
  await query(
    `UPDATE crm_staff SET last_login_at = NOW() WHERE id = $1`,
    [row.id]
  );
  return { ...row.data, lastLoginAt: new Date().toISOString() };
}

export async function createStaffSession(staffId: string): Promise<string> {
  const token = randomUUID() + "-" + Date.now().toString(36);
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 giờ
  await query(
    `INSERT INTO crm_staff_sessions (id, staff_id, token, expires_at) VALUES ($1, $2, $3, $4)`,
    [randomUUID(), staffId, token, expiresAt.toISOString()]
  );
  return token;
}

export async function verifyStaffSession(token: string): Promise<StaffMember | null> {
  if (!token) return null;
  await initStaffSchema();
  const row = await queryOne<{ staff_id: string; expires_at: string }>(
    `SELECT staff_id, expires_at FROM crm_staff_sessions WHERE token = $1`,
    [token]
  );
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await query("DELETE FROM crm_staff_sessions WHERE token = $1", [token]);
    return null;
  }
  return getStaffById(row.staff_id);
}

export async function deleteStaffSession(token: string): Promise<void> {
  await query("DELETE FROM crm_staff_sessions WHERE token = $1", [token]);
}
