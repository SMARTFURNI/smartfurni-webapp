import { NextRequest, NextResponse } from "next/server";
import { getSmartBedSession, recordSmartBedAppEvent } from "@/lib/smart-bed-auth";
import { detectSmartBedPlatform } from "@/lib/smart-bed-platform";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSmartBedSession();
  const platform = detectSmartBedPlatform(request.headers.get("user-agent") || "");

  try {
    await recordSmartBedAppEvent({
      eventType: "qr_scan",
      userId: user?.id,
      platform,
      source: "qr",
    });
  } catch (error) {
    console.error("Unable to record smart-bed QR scan", error);
  }

  const target = user
    ? "/dashboard?source=qr&install=1"
    : "/smart-bed/login?source=qr";
  const response = NextResponse.redirect(new URL(target, request.url), 307);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
