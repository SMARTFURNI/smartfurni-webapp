import { NextRequest, NextResponse } from "next/server";
import { trackPageView, initAnalyticsTables } from "@/lib/analytics-store";
import crypto from "crypto";

let tablesInitialized = false;

export async function POST(req: NextRequest) {
  try {
    if (!tablesInitialized) {
      await initAnalyticsTables();
      tablesInitialized = true;
    }

    const body = await req.json();
    const path: string = body.path || "/";
    const referrer: string = body.referrer || "";
    const sessionId: string = body.sessionId || "";

    // Hash IP for privacy
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const ipHash = crypto.createHash("sha256").update(ip + process.env.DATABASE_URL?.slice(-8) || "salt").digest("hex").slice(0, 16);

    const ua = req.headers.get("user-agent") || "";

    // Skip admin and API paths
    if (path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }

    await trackPageView({ path, referrer, ua, ipHash, sessionId });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
