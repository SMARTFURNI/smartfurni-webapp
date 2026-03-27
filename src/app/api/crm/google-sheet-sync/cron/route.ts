/**
 * GET /api/crm/google-sheet-sync/cron
 * Cron endpoint — gọi định kỳ bởi Railway Cron hoặc Vercel Cron
 *
 * Bảo mật bằng CRON_SECRET env variable.
 * Cấu hình Railway Cron: mỗi 15 phút → "0,15,30,45 * * * *"
 */
import { NextRequest, NextResponse } from "next/server";
import { syncAllGoogleSheets } from "@/lib/google-sheet-sync";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const querySecret = new URL(req.url).searchParams.get("secret");
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    console.log("[GSheet Cron] Starting sync...");
    const result = await syncAllGoogleSheets();
    console.log(`[GSheet Cron] Done. New: ${result.totalNew}, Skipped: ${result.totalSkipped}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[GSheet Cron] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
