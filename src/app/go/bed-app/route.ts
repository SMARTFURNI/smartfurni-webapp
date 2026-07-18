import { NextRequest, NextResponse } from "next/server";
import { getSmartBedSession, recordSmartBedAppEvent } from "@/lib/smart-bed-auth";
import { detectSmartBedPlatform } from "@/lib/smart-bed-platform";

export const dynamic = "force-dynamic";

function getPublicOrigin(request: NextRequest) {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    .trim();

  if (!forwardedHost) return request.nextUrl.origin;

  const forwardedProtocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
  return `${forwardedProtocol}://${forwardedHost}`;
}

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
  const response = NextResponse.redirect(new URL(target, getPublicOrigin(request)), 307);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
