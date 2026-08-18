import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getAutomationConfigVersion, listAutomationConfigVersions, saveAutomationConfigVersion, type AutomationConfigScope } from "@/lib/crm-automation-governance";
import { saveAutomationContactPolicy, saveAutomationRules, saveAutoAssignConfig, saveSlaConfig } from "@/lib/crm-automation-store";
import { saveB2BSofaJourneySettings } from "@/lib/crm-b2b-sofa-journey-store";
import { saveB2CErgonomicBedJourneySettings } from "@/lib/crm-b2c-ergonomic-bed-journey-store";
import { saveB2CSofaBedJourneySettings } from "@/lib/crm-b2c-sofa-bed-journey-store";
import { logAudit, getClientIp } from "@/lib/audit-helper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = req.nextUrl.searchParams.get("scope") as AutomationConfigScope | null;
  return NextResponse.json({ versions: await listAutomationConfigVersions(scope || undefined, 100) });
}

export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!['restore', 'publish'].includes(body.action) || !body.versionId || body.confirmed !== true) {
    return NextResponse.json({ error: "Yêu cầu phiên bản không hợp lệ." }, { status: 400 });
  }
  const selected = await getAutomationConfigVersion(String(body.versionId));
  if (!selected) return NextResponse.json({ error: "Không tìm thấy phiên bản." }, { status: 404 });
  const snapshot = selected.snapshot as never;
  if (selected.version.scope === "rules") await saveAutomationRules(snapshot);
  else if (selected.version.scope === "sla") await saveSlaConfig(snapshot);
  else if (selected.version.scope === "auto_assign") await saveAutoAssignConfig(snapshot);
  else if (selected.version.scope === "contact_policy") await saveAutomationContactPolicy(snapshot);
  else if (selected.version.scope === "b2b_sofa") await saveB2BSofaJourneySettings(snapshot);
  else if (selected.version.scope === "b2c_ergonomic") await saveB2CErgonomicBedJourneySettings(snapshot);
  else if (selected.version.scope === "b2c_sofa") await saveB2CSofaBedJourneySettings(snapshot);
  const restored = await saveAutomationConfigVersion({ scope: selected.version.scope, snapshot, status: "published",
    note: body.action === 'publish' ? `Xuất bản từ bản nháp ${selected.version.version}` : `Khôi phục từ phiên bản ${selected.version.version}`, actorId: "admin", actorName: "Admin" });
  await logAudit({ action: "automation.version_restored", entityType: "automation", entityId: selected.version.scope,
    entityName: selected.version.scope, actorId: "admin", actorName: "Admin", ipAddress: getClientIp(req),
    metadata: { restoredFrom: selected.version.version, newVersion: restored.version, operation: body.action } });
  return NextResponse.json({ ok: true, restored });
}
