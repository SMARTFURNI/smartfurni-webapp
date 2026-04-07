import { getDb } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Tất cả các chức năng/module trong CRM có thể phân quyền */
export interface RolePermissions {
  // ── Tổng quan ──
  dashboard_view: boolean;
  kanban_view: boolean;
  twelve_week_plan_view: boolean;
  plans_management_view: boolean;

  // ── Khách hàng ──
  data_pool_view: boolean;
  leads_view_all: boolean;        // Xem tất cả KH (không chỉ của mình)
  leads_view_own: boolean;        // Xem KH của mình
  leads_create: boolean;
  leads_edit: boolean;
  leads_delete: boolean;
  leads_assign: boolean;          // Phân công KH
  leads_export: boolean;
  lead_segmentation_view: boolean;
  quotes_view_all: boolean;
  quotes_view_own: boolean;
  quotes_create: boolean;
  quotes_approve: boolean;
  quotes_give_discount: boolean;  // Chiết khấu thêm
  call_logs_view: boolean;
  call_logs_create: boolean;
  tasks_view: boolean;
  tasks_create: boolean;
  calendar_view: boolean;

  // ── Marketing & CS ──
  email_marketing_view: boolean;
  content_marketing_view: boolean;
  content_marketing_settings: boolean; // Cài đặt AI trong Content Marketing
  contracts_view: boolean;
  contracts_create: boolean;
  nps_view: boolean;
  notifications_view: boolean;
  zalo_oa_view: boolean;
  zalo_inbox_view: boolean;

  // ── Sản phẩm ──
  products_view: boolean;
  products_edit: boolean;

  // ── Quản lý & Báo cáo ──
  staff_view: boolean;
  staff_manage: boolean;
  reports_view: boolean;
  reports_export: boolean;
  crm_settings_view: boolean;
  crm_settings_edit: boolean;

  // ── Tự động hóa & Bảo mật ──
  ai_agent_view: boolean;
  automation_view: boolean;
  facebook_scheduler_view: boolean;
  audit_logs_view: boolean;
  permissions_manage: boolean;
  import_export_view: boolean;
}

export interface CustomRole {
  id: string;
  name: string;           // Tên vai trò: "Kinh doanh", "Marketing", "Leader", "Kế toán"
  color: string;          // Màu badge
  icon: string;           // Emoji icon
  description: string;
  permissions: RolePermissions;
  isSystem: boolean;      // Vai trò hệ thống (không xóa được)
  staffCount?: number;    // Số nhân viên đang dùng role này
  createdAt: string;
  updatedAt: string;
}

// ─── Permission Labels & Groups ───────────────────────────────────────────────

export const PERMISSION_LABELS: Record<keyof RolePermissions, string> = {
  // Tổng quan
  dashboard_view: "Xem Dashboard",
  kanban_view: "Xem Bảng Kanban",
  twelve_week_plan_view: "Xem Kế hoạch 12 Tuần",
  plans_management_view: "Quản lý Kế hoạch",
  // Khách hàng
  data_pool_view: "Xem Data Pool",
  leads_view_all: "Xem tất cả Khách hàng",
  leads_view_own: "Xem KH của mình",
  leads_create: "Tạo Khách hàng mới",
  leads_edit: "Chỉnh sửa Khách hàng",
  leads_delete: "Xóa Khách hàng",
  leads_assign: "Phân công Khách hàng",
  leads_export: "Xuất danh sách KH",
  lead_segmentation_view: "Phân loại Lead",
  quotes_view_all: "Xem tất cả Báo giá",
  quotes_view_own: "Xem Báo giá của mình",
  quotes_create: "Tạo Báo giá",
  quotes_approve: "Duyệt Báo giá",
  quotes_give_discount: "Chiết khấu thêm",
  call_logs_view: "Xem Cuộc gọi",
  call_logs_create: "Ghi nhận Cuộc gọi",
  tasks_view: "Xem Việc cần làm",
  tasks_create: "Tạo Việc cần làm",
  calendar_view: "Xem Lịch hẹn",
  // Marketing & CS
  email_marketing_view: "Email Marketing",
  content_marketing_view: "Content Marketing AI",
  content_marketing_settings: "Cài đặt AI Content",
  contracts_view: "Hợp đồng điện tử",
  contracts_create: "Tạo Hợp đồng",
  nps_view: "Khảo sát NPS",
  notifications_view: "Nhắc nhở Zalo/SMS",
  zalo_oa_view: "Zalo OA",
  zalo_inbox_view: "Zalo Inbox",
  // Sản phẩm
  products_view: "Xem Sản phẩm",
  products_edit: "Chỉnh sửa Sản phẩm",
  // Quản lý & Báo cáo
  staff_view: "Xem Nhân viên",
  staff_manage: "Quản lý Nhân viên",
  reports_view: "Xem Báo cáo",
  reports_export: "Xuất Báo cáo",
  crm_settings_view: "Xem Cài đặt CRM",
  crm_settings_edit: "Chỉnh sửa Cài đặt CRM",
  // Tự động hóa & Bảo mật
  ai_agent_view: "AI Agent",
  automation_view: "Automation Rules",
  facebook_scheduler_view: "Lịch đăng bài FB",
  audit_logs_view: "Nhật ký hoạt động",
  permissions_manage: "Phân quyền & API Keys",
  import_export_view: "Import / Export",
};

export const PERMISSION_GROUPS: {
  label: string;
  icon: string;
  color: string;
  keys: (keyof RolePermissions)[];
}[] = [
  {
    label: "Tổng quan",
    icon: "📊",
    color: "#6366f1",
    keys: ["dashboard_view", "kanban_view", "twelve_week_plan_view", "plans_management_view"],
  },
  {
    label: "Khách hàng",
    icon: "👥",
    color: "#22c55e",
    keys: [
      "data_pool_view", "leads_view_all", "leads_view_own", "leads_create",
      "leads_edit", "leads_delete", "leads_assign", "leads_export",
      "lead_segmentation_view", "quotes_view_all", "quotes_view_own",
      "quotes_create", "quotes_approve", "quotes_give_discount",
      "call_logs_view", "call_logs_create", "tasks_view", "tasks_create", "calendar_view",
    ],
  },
  {
    label: "Marketing & CS",
    icon: "📣",
    color: "#f59e0b",
    keys: [
      "email_marketing_view", "content_marketing_view", "content_marketing_settings",
      "contracts_view", "contracts_create", "nps_view",
      "notifications_view", "zalo_oa_view", "zalo_inbox_view",
    ],
  },
  {
    label: "Sản phẩm",
    icon: "📦",
    color: "#06b6d4",
    keys: ["products_view", "products_edit"],
  },
  {
    label: "Quản lý & Báo cáo",
    icon: "📈",
    color: "#8b5cf6",
    keys: ["staff_view", "staff_manage", "reports_view", "reports_export", "crm_settings_view", "crm_settings_edit"],
  },
  {
    label: "Tự động hóa & Bảo mật",
    icon: "🔐",
    color: "#ef4444",
    keys: ["ai_agent_view", "automation_view", "facebook_scheduler_view", "audit_logs_view", "permissions_manage", "import_export_view"],
  },
];

// ─── Default Permissions per Role Template ────────────────────────────────────

const ALL_FALSE: RolePermissions = {
  dashboard_view: false, kanban_view: false, twelve_week_plan_view: false, plans_management_view: false,
  data_pool_view: false, leads_view_all: false, leads_view_own: false, leads_create: false,
  leads_edit: false, leads_delete: false, leads_assign: false, leads_export: false,
  lead_segmentation_view: false, quotes_view_all: false, quotes_view_own: false,
  quotes_create: false, quotes_approve: false, quotes_give_discount: false,
  call_logs_view: false, call_logs_create: false, tasks_view: false, tasks_create: false,
  calendar_view: false, email_marketing_view: false, content_marketing_view: false,
  content_marketing_settings: false, contracts_view: false, contracts_create: false,
  nps_view: false, notifications_view: false, zalo_oa_view: false, zalo_inbox_view: false,
  products_view: false, products_edit: false, staff_view: false, staff_manage: false,
  reports_view: false, reports_export: false, crm_settings_view: false, crm_settings_edit: false,
  ai_agent_view: false, automation_view: false, facebook_scheduler_view: false,
  audit_logs_view: false, permissions_manage: false, import_export_view: false,
};

export const ROLE_TEMPLATES: Record<string, { name: string; color: string; icon: string; description: string; permissions: RolePermissions }> = {
  super_admin: {
    name: "Quản trị viên",
    color: "#C9A84C",
    icon: "👑",
    description: "Toàn quyền hệ thống",
    permissions: Object.fromEntries(Object.keys(ALL_FALSE).map(k => [k, true])) as unknown as RolePermissions,
  },
  leader: {
    name: "Leader / Trưởng nhóm",
    color: "#8b5cf6",
    icon: "⭐",
    description: "Quản lý nhóm, xem báo cáo toàn bộ",
    permissions: {
      ...ALL_FALSE,
      dashboard_view: true, kanban_view: true, twelve_week_plan_view: true, plans_management_view: true,
      data_pool_view: true, leads_view_all: true, leads_view_own: true, leads_create: true,
      leads_edit: true, leads_delete: false, leads_assign: true, leads_export: true,
      lead_segmentation_view: true, quotes_view_all: true, quotes_view_own: true,
      quotes_create: true, quotes_approve: true, quotes_give_discount: true,
      call_logs_view: true, call_logs_create: true, tasks_view: true, tasks_create: true,
      calendar_view: true, content_marketing_view: true, contracts_view: true,
      notifications_view: true, zalo_inbox_view: true, products_view: true,
      staff_view: true, reports_view: true, reports_export: true,
    },
  },
  sales: {
    name: "Kinh doanh",
    color: "#22c55e",
    icon: "💼",
    description: "Quản lý KH, tạo báo giá, theo dõi pipeline",
    permissions: {
      ...ALL_FALSE,
      dashboard_view: true, kanban_view: true, twelve_week_plan_view: true,
      data_pool_view: true, leads_view_own: true, leads_create: true,
      leads_edit: true, leads_export: false,
      quotes_view_own: true, quotes_create: true,
      call_logs_view: true, call_logs_create: true, tasks_view: true, tasks_create: true,
      calendar_view: true, contracts_view: true, contracts_create: true,
      notifications_view: true, zalo_inbox_view: true, products_view: true,
    },
  },
  marketing: {
    name: "Marketing",
    color: "#f59e0b",
    icon: "📣",
    description: "Quản lý nội dung, email, Zalo, kịch bản video",
    permissions: {
      ...ALL_FALSE,
      dashboard_view: true, kanban_view: true,
      data_pool_view: true, leads_view_all: true, leads_view_own: true,
      leads_export: true, lead_segmentation_view: true,
      email_marketing_view: true, content_marketing_view: true,
      nps_view: true, notifications_view: true, zalo_oa_view: true, zalo_inbox_view: true,
      products_view: true, reports_view: true, facebook_scheduler_view: true,
    },
  },
  accountant: {
    name: "Kế toán",
    color: "#06b6d4",
    icon: "💰",
    description: "Xem báo giá, hợp đồng, báo cáo doanh thu",
    permissions: {
      ...ALL_FALSE,
      dashboard_view: true, leads_view_all: true,
      quotes_view_all: true, quotes_approve: true,
      contracts_view: true, products_view: true,
      reports_view: true, reports_export: true,
    },
  },
  intern: {
    name: "Thực tập sinh",
    color: "#6b7280",
    icon: "🎓",
    description: "Quyền hạn cơ bản, chỉ xem và tạo KH của mình",
    permissions: {
      ...ALL_FALSE,
      dashboard_view: true, kanban_view: true,
      leads_view_own: true, leads_create: true,
      call_logs_view: true, call_logs_create: true,
      tasks_view: true, tasks_create: true, calendar_view: true,
      zalo_inbox_view: true, products_view: true,
    },
  },
};

// ─── DB Schema & CRUD ─────────────────────────────────────────────────────────

export async function initRolesSchema(): Promise<void> {
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_custom_roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b7280',
      icon TEXT NOT NULL DEFAULT '👤',
      description TEXT NOT NULL DEFAULT '',
      permissions JSONB NOT NULL DEFAULT '{}',
      is_system BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Seed default roles nếu chưa có
  const existing = await db.query("SELECT id FROM crm_custom_roles LIMIT 1");
  if (existing.rows.length === 0) {
    const now = new Date().toISOString();
    for (const [id, tpl] of Object.entries(ROLE_TEMPLATES)) {
      await db.query(
        `INSERT INTO crm_custom_roles (id, name, color, icon, description, permissions, is_system, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [id, tpl.name, tpl.color, tpl.icon, tpl.description, JSON.stringify(tpl.permissions), id === "super_admin", now, now]
      );
    }
  }
}

function mapRow(row: Record<string, unknown>): CustomRole {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    icon: row.icon as string,
    description: row.description as string,
    permissions: (typeof row.permissions === "string" ? JSON.parse(row.permissions) : row.permissions) as RolePermissions,
    isSystem: row.is_system as boolean,
    createdAt: (row.created_at as Date)?.toISOString?.() ?? row.created_at as string,
    updatedAt: (row.updated_at as Date)?.toISOString?.() ?? row.updated_at as string,
  };
}

export async function getAllRoles(): Promise<CustomRole[]> {
  await initRolesSchema();
  const db = getDb();
  const res = await db.query(`
    SELECT r.*, COUNT(s.id)::int AS staff_count
    FROM crm_custom_roles r
    LEFT JOIN crm_staff s ON s.role = r.id
    GROUP BY r.id
    ORDER BY r.is_system DESC, r.created_at ASC
  `);
  return res.rows.map(row => ({ ...mapRow(row), staffCount: row.staff_count ?? 0 }));
}

export async function getRoleById(id: string): Promise<CustomRole | null> {
  await initRolesSchema();
  const db = getDb();
  const res = await db.query("SELECT * FROM crm_custom_roles WHERE id = $1", [id]);
  if (!res.rows[0]) return null;
  return mapRow(res.rows[0]);
}

export async function createRole(data: {
  name: string;
  color: string;
  icon: string;
  description: string;
  permissions: RolePermissions;
}): Promise<CustomRole> {
  await initRolesSchema();
  const db = getDb();
  const id = data.name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") + "_" + Date.now().toString(36);
  const now = new Date().toISOString();
  await db.query(
    `INSERT INTO crm_custom_roles (id, name, color, icon, description, permissions, is_system, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)`,
    [id, data.name, data.color, data.icon, data.description, JSON.stringify(data.permissions), now, now]
  );
  return (await getRoleById(id))!;
}

export async function updateRole(id: string, data: Partial<{
  name: string;
  color: string;
  icon: string;
  description: string;
  permissions: RolePermissions;
}>): Promise<CustomRole | null> {
  await initRolesSchema();
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
  if (data.color !== undefined) { fields.push(`color = $${idx++}`); values.push(data.color); }
  if (data.icon !== undefined) { fields.push(`icon = $${idx++}`); values.push(data.icon); }
  if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
  if (data.permissions !== undefined) { fields.push(`permissions = $${idx++}`); values.push(JSON.stringify(data.permissions)); }
  if (fields.length === 0) return getRoleById(id);
  fields.push(`updated_at = NOW()`);
  values.push(id);
  await db.query(`UPDATE crm_custom_roles SET ${fields.join(", ")} WHERE id = $${idx}`, values);
  return getRoleById(id);
}

export async function deleteRole(id: string): Promise<{ ok: boolean; error?: string }> {
  await initRolesSchema();
  const db = getDb();
  const role = await getRoleById(id);
  if (!role) return { ok: false, error: "Không tìm thấy vai trò" };
  if (role.isSystem) return { ok: false, error: "Không thể xóa vai trò hệ thống" };
  const staffRes = await db.query("SELECT COUNT(*)::int AS cnt FROM crm_staff WHERE role = $1", [id]);
  if ((staffRes.rows[0]?.cnt ?? 0) > 0) {
    return { ok: false, error: `Vai trò đang được dùng bởi ${staffRes.rows[0].cnt} nhân viên. Hãy chuyển họ sang vai trò khác trước.` };
  }
  await db.query("DELETE FROM crm_custom_roles WHERE id = $1", [id]);
  return { ok: true };
}
