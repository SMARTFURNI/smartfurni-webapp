import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getActivities, createActivity } from "@/lib/crm-store";
import { logAudit, getClientIp } from "@/lib/audit-helper";

export async function GET(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });
  return NextResponse.json(await getActivities(leadId));
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const activity = await createActivity(body);
  await logAudit({
    action: "activity.created",
    entityType: "activity",
    entityId: activity.id,
    entityName: activity.type || "Hoạt động mới",
    actorId: session.staffId || null,
    actorName: session.isAdmin ? "Admin" : (session.staffId || "System"),
    ipAddress: getClientIp(req),
    metadata: { leadId: activity.leadId, type: activity.type },
  });
  return NextResponse.json(activity, { status: 201 });
}
