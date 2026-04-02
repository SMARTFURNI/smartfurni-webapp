import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask } from "@/lib/crm-store";
import { logAudit, getClientIp } from "@/lib/audit-helper";

export async function GET(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId") || undefined;
  const dueToday = searchParams.get("dueToday") === "true";
  return NextResponse.json(await getTasks({ leadId, dueToday }));
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const task = await createTask(body);
  await logAudit({
    action: "task.created",
    entityType: "task",
    entityId: task.id,
    entityName: task.title || "Task mới",
    actorId: session.staffId || null,
    actorName: session.isAdmin ? "Admin" : (session.staffId || "System"),
    ipAddress: getClientIp(req),
    metadata: { leadId: task.leadId, dueDate: task.dueDate, assignedTo: task.assignedTo },
  });
  return NextResponse.json(task, { status: 201 });
}
