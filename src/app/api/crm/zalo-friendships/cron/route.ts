import { NextRequest, NextResponse } from "next/server";
import { runZaloFriendshipAutomation } from "@/lib/crm-zalo-friendship";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Cron secret is not configured" }, { status: 503 });
  }
  if (secret) {
    const authorization = req.headers.get("authorization");
    const querySecret = new URL(req.url).searchParams.get("secret");
    if (authorization !== `Bearer ${secret}` && querySecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    return NextResponse.json({ ok: true, ...(await runZaloFriendshipAutomation()) });
  } catch (error) {
    console.error("[ZaloFriendshipCron]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Zalo friendship cron failed" }, { status: 500 });
  }
}
