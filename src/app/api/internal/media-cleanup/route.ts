import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredMediaObjects } from "@/lib/media-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await cleanupExpiredMediaObjects(250);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[media-cleanup]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cleanup failed" },
      { status: 500 },
    );
  }
}
