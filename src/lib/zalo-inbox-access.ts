import { getDb } from "./db";
import { getCrmSession } from "./admin-auth";
import { getRoleById, type RolePermissions } from "./crm-roles-store";
import { ensureZaloInboxTables } from "./zalo-inbox-store";

export interface ZaloInboxSession {
  isAdmin?: boolean;
  staffId?: string;
  staffRole?: string;
}

/**
 * Phân quyền Zalo Inbox theo nguyên tắc fail-closed:
 * - quản trị viên/manager luôn có quyền;
 * - nhân viên chỉ có quyền khi được cấp rõ ràng;
 * - lỗi DB hoặc thiếu định danh không được tự động mở quyền.
 */
function isPrivilegedSession(session: ZaloInboxSession): boolean {
  return Boolean(session.isAdmin) || ["admin", "manager", "super_admin"].includes(
    String(session.staffRole || "").toLowerCase(),
  );
}

async function hasRolePermission(
  session: ZaloInboxSession,
  permission: keyof RolePermissions,
): Promise<boolean> {
  if (!session.staffRole) return false;
  try {
    const role = await getRoleById(session.staffRole);
    return role?.permissions?.[permission] === true;
  } catch (error) {
    console.error(`[ZaloInboxAccess] Role permission check failed: ${permission}`, error);
    return false;
  }
}

/** Danh sách cấp quyền theo nhân viên cũ được giữ để tương thích ngược. */
async function hasLegacyStaffGrant(staffId?: string): Promise<boolean> {
  if (!staffId) return false;
  try {
    await ensureZaloInboxTables();
    const db = getDb();
    const result = await db.query(
      `SELECT 1 FROM zalo_inbox_access WHERE staff_id = $1 LIMIT 1`,
      [staffId],
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("[ZaloInboxAccess] Legacy permission check failed", error);
    return false;
  }
}

export async function canAccessZaloInbox(session: ZaloInboxSession | null): Promise<boolean> {
  if (!session) return false;
  if (isPrivilegedSession(session)) return true;
  if (await hasRolePermission(session, "zalo_inbox_view")) return true;
  return hasLegacyStaffGrant(session.staffId);
}

/** Kiểm tra quyền gửi riêng, độc lập với quyền chỉ xem hộp thư. */
export async function canSendZaloInboxMessages(session: ZaloInboxSession | null): Promise<boolean> {
  if (!session) return false;
  if (isPrivilegedSession(session)) return true;
  if (await hasRolePermission(session, "zalo_inbox_send")) return true;
  return hasLegacyStaffGrant(session.staffId);
}

/** Trả về session đã được xác thực quyền, hoặc null nếu bị từ chối. */
export async function getAuthorizedZaloInboxSession() {
  const session = await getCrmSession();
  return await canAccessZaloInbox(session) ? session : null;
}

/** Trả về session có quyền gửi tin nhắn, hoặc null nếu bị từ chối. */
export async function getAuthorizedZaloInboxSendSession() {
  const session = await getCrmSession();
  return await canSendZaloInboxMessages(session) ? session : null;
}
