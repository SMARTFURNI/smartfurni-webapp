import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getAutomationRules, saveAutomationRules,
  getSlaConfig, saveSlaConfig,
  getAutoAssignConfig, saveAutoAssignConfig,
  getAutomationContactPolicy, saveAutomationContactPolicy,
} from "@/lib/crm-automation-store";
import { getAllStaff } from "@/lib/crm-staff-store";
import { saveAutomationConfigVersion, type AutomationConfigScope } from "@/lib/crm-automation-governance";
import { logAudit, getClientIp } from "@/lib/audit-helper";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "rules";
  if (type === "sla") return NextResponse.json(await getSlaConfig());
  if (type === "auto_assign") return NextResponse.json(await getAutoAssignConfig());
  if (type === "contact_policy") return NextResponse.json(await getAutomationContactPolicy());
  if (type === "staff") {
    const staff = await getAllStaff();
    return NextResponse.json(staff.filter(item => item.status === "active").map(item => ({ id: item.id, name: item.fullName, role: item.role })));
  }
  return NextResponse.json(await getAutomationRules());
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { type, data } = body;
  const scope = (["rules", "sla", "auto_assign", "contact_policy"].includes(type) ? type : "rules") as AutomationConfigScope;
  const isDraft = body.mode === "draft";
  if (!isDraft) {
    if (type === "sla") await saveSlaConfig(data);
    else if (type === "auto_assign") await saveAutoAssignConfig(data);
    else if (type === "contact_policy") await saveAutomationContactPolicy(data);
    else await saveAutomationRules(data);
  }
  const version = await saveAutomationConfigVersion({ scope, snapshot: data, status: isDraft ? "draft" : "published", note: String(body.note || (isDraft ? "Lưu bản nháp từ Automation Center" : "Lưu từ Automation Center")), actorId: "admin", actorName: "Admin" });
  await logAudit({ action: "automation.config_saved", entityType: "automation", entityId: scope, entityName: scope,
    actorId: "admin", actorName: "Admin", ipAddress: getClientIp(req), metadata: { version: version.version, status: version.status } });
  return NextResponse.json({ ok: true, applied: !isDraft, version });
}
