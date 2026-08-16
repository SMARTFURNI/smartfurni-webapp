import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { previewAutomationEngine, runAutomationEngine } from "@/lib/crm-automation-engine";
import { claimAutomationSchedulerRun, releaseAutomationSchedulerRun } from "@/lib/crm-automation-execution-store";
import { getClientIp, logAudit } from "@/lib/audit-helper";

/**
 * POST /api/crm/automation/run
 * Chạy automation engine thủ công (admin only)
 */
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claimed = await claimAutomationSchedulerRun();
  if (!claimed) {
    return NextResponse.json({ error: "Automation đang chạy ở tiến trình khác." }, { status: 409 });
  }
  try {
    const result = await runAutomationEngine();
    await logAudit({ action: "automation.engine_run", entityType: "automation", entityId: "manual", entityName: "Automation engine",
      actorId: "admin", actorName: "Admin", ipAddress: getClientIp(req), metadata: { totalLeads: result.totalLeads, totalTriggered: result.totalTriggered } });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[Automation Engine] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    await releaseAutomationSchedulerRun().catch(() => undefined);
  }
}

/**
 * GET /api/crm/automation/run
 * Lấy trạng thái lần chạy cuối
 */
export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await previewAutomationEngine());
}
