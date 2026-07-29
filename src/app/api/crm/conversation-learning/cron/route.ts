import { NextRequest, NextResponse } from "next/server";
import { runDailyFanpageCareCenter } from "@/lib/fanpage-care-center";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`
    || new URL(req.url).searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runDailyFanpageCareCenter({
      actorId: "daily-cron",
      runType: "scheduled",
    });
    if ("plans" in result && Array.isArray(result.plans)) {
      return NextResponse.json({
        ok: true,
        run: result.run,
        planCount: result.plans.length,
      });
    }
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("[Fanpage AI Care Cron] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
