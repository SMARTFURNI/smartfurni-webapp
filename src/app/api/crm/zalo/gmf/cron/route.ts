import { NextRequest, NextResponse } from "next/server";
import { processDueZaloGmfSchedules, syncZaloGmfGroups } from "@/lib/zalo-gmf-store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await processDueZaloGmfSchedules(12);
    let reconciliation: { groups: number; members: number; warnings: string[] } | null = null;
    const minute = new Date().getUTCMinutes();
    if (minute % 15 === 0) {
      try { reconciliation = await syncZaloGmfGroups({ syncMembers: true }); }
      catch (error) { reconciliation = { groups: 0, members: 0, warnings: [error instanceof Error ? error.message : "Lỗi đối soát GMF"] }; }
    }
    return NextResponse.json({ ok: true, ...result, reconciliation });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "GMF cron failed" }, { status: 500 });
  }
}
