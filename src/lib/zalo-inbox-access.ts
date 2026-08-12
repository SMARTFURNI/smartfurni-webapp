import { getDb } from "./db";
import { getCrmSession } from "./admin-auth";
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
export async function canAccessZaloInbox(session: ZaloInboxSession | null): Promise<boolean> {
  if (!session) return false;
  if (session.isAdmin) return true;
  if (["admin", "manager"].includes(String(session.staffRole || "").toLowerCase())) return true;
  if (!session.staffId) return false;

  try {
    await ensureZaloInboxTables();
    const db = getDb();
    const result = await db.query(
      `SELECT 1 FROM zalo_inbox_access WHERE staff_id = $1 LIMIT 1`,
      [session.staffId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("[ZaloInboxAccess] Permission check failed", error);
    return false;
  }
}

/** Trả về session đã được xác thực quyền, hoặc null nếu bị từ chối. */
export async function getAuthorizedZaloInboxSession() {
  const session = await getCrmSession();
  return await canAccessZaloInbox(session) ? session : null;
}
