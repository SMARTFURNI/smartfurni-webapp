/**
 * audit-helper.ts
 * Helper functions để ghi audit log dễ dàng từ API routes
 */
import { NextRequest } from "next/server";
import { addAuditLog, type AuditAction } from "./crm-audit-store";

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
