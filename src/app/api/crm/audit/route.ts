import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getAuditLogs, type AuditLogFilter, type AuditAction } from "@/lib/crm-audit-store";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const filter: AuditLogFilter = {
    action: (searchParams.get("action") as AuditAction) || undefined,
    entityType: searchParams.get("entityType") || undefined,
    actorId: searchParams.get("actorId") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    limit: parseInt(searchParams.get("limit") ?? "50"),
    offset: parseInt(searchParams.get("offset") ?? "0"),
  };
  return NextResponse.json(await getAuditLogs(filter));
}
