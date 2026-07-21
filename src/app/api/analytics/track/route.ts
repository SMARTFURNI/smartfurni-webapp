import { NextRequest, NextResponse } from "next/server";
import { trackPageView, initAnalyticsTables } from "@/lib/analytics-store";
import crypto from "crypto";

let tablesInitialized = false;
const INTERNAL_PATHS = ["/admin", "/api", "/crm", "/dashboard", "/smart-bed", "/choose-module"];

function clean(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  try {
    if (!tablesInitialized) {
      await initAnalyticsTables();
      tablesInitialized = true;
    }

    const body = await req.json();
    const path = clean(body.path, 2000) || "/";
    const referrer = clean(body.referrer, 2000);
    const sessionId = clean(body.sessionId, 160);

    // Hash IP for privacy
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const salt = process.env.ANALYTICS_SALT || process.env.DATABASE_URL?.slice(-16) || "smartfurni";
    const ipHash = crypto.createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 16);

    const ua = req.headers.get("user-agent") || "";

    // Skip admin and API paths
    const cleanPath = path.split("?")[0];
    if (INTERNAL_PATHS.some((prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`))) {
      return NextResponse.json({ ok: true });
    }

    await trackPageView({
      path,
      referrer,
      ua,
      ipHash,
      sessionId,
      fullUrl: clean(body.fullUrl, 2000),
      utmSource: clean(body.utmSource, 200),
      utmMedium: clean(body.utmMedium, 200),
      utmCampaign: clean(body.utmCampaign, 300),
      utmTerm: clean(body.utmTerm, 300),
      utmContent: clean(body.utmContent, 300),
      gclid: clean(body.gclid, 300),
      fbclid: clean(body.fbclid, 300),
      ttclid: clean(body.ttclid, 300),
      msclkid: clean(body.msclkid, 300),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
