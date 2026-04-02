/**
 * audit-helper.ts
 * Helper functions để ghi audit log dễ dàng từ API routes
 */
import { NextRequest } from "next/server";
import { addAuditLog, type AuditAction } from "./crm-audit-store";
import { getStaffById } from "./crm-staff-store";

/**
 * Lấy IP address từ request
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0].trim();
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Lấy tên hiển thị của người thực hiện từ session
 * - Admin → "Admin (Phạm Nhất Bá Tuất)"
 * - Nhân viên → fullName từ DB
 * - Fallback → staffId hoặc "System"
 */
export async function resolveActorName(session: { isAdmin: boolean; staffId?: string } | null): Promise<{ actorId: string | null; actorName: string }> {
  if (!session) return { actorId: null, actorName: "System" };
  if (session.isAdmin) return { actorId: "admin", actorName: "Admin" };
  if (session.staffId) {
    try {
      const staff = await getStaffById(session.staffId);
      if (staff?.fullName) return { actorId: session.staffId, actorName: staff.fullName };
    } catch {
      // fallback
    }
    return { actorId: session.staffId, actorName: session.staffId };
  }
  return { actorId: null, actorName: "System" };
}

/**
 * Ghi audit log cho hành động CRM
 */
export async function logAudit(params: {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  actorId?: string | null;
  actorName: string;
  ipAddress?: string | null;
  changes?: Record<string, { before: unknown; after: unknown }> | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    await addAuditLog({
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      entityName: params.entityName ?? null,
      actorId: params.actorId ?? null,
      actorName: params.actorName,
      ipAddress: params.ipAddress ?? null,
      changes: params.changes ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (error) {
    // Non-blocking: audit log failure should not break main flow
    console.error("[Audit] Failed to write log:", error);
  }
}
