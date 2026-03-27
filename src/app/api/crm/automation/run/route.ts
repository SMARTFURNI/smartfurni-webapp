import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { runAutomationEngine } from "@/lib/crm-automation-engine";

/**
 * POST /api/crm/automation/run
 * Chạy automation engine thủ công (admin only)
 */
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await runAutomationEngine();
    return NextResponse.json(result);
  } catch (e) {
    console.error("[Automation Engine] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/crm/automation/run
 * Lấy trạng thái lần chạy cuối
 */
export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ message: "POST to this endpoint to run the automation engine" });
}
