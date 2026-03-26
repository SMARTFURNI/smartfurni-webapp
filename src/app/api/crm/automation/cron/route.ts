import { NextRequest, NextResponse } from "next/server";
import { runAutomationEngine } from "@/lib/crm-automation-engine";

/**
 * GET /api/crm/automation/cron
 * Cron endpoint — gọi định kỳ bởi Railway Cron hoặc Vercel Cron
 *
 * Bảo mật bằng CRON_SECRET env variable.
 * Cau hinh Railway Cron: every-30-min (moi 30 phut)
 *
 * Them vao vercel.json:
 * { "crons": [{ "path": "/api/crm/automation/cron", "schedule": "0,30 * * * *" }] }
 */
export async function GET(req: NextRequest) {
  // Xác thực bằng CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const querySecret = new URL(req.url).searchParams.get("secret");
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    console.log("[CRM Cron] Starting automation engine run...");
    const result = await runAutomationEngine();
    console.log(`[CRM Cron] Done. Triggered: ${result.totalTriggered}/${result.totalLeads} leads`);
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (e) {
    console.error("[CRM Cron] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
