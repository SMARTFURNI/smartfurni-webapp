import { NextRequest, NextResponse } from "next/server";
import { processDueCallAiJobs } from "@/lib/crm-call-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Cron secret is not configured" }, { status: 503 });
  }
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    const querySecret = new URL(req.url).searchParams.get("secret");
    if (auth !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const results = await processDueCallAiJobs(Math.max(1, Number(process.env.CALL_AI_BATCH_SIZE || 1)));
    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (error) {
    console.error("[Call AI Cron] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
