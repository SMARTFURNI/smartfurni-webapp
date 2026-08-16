import { NextRequest, NextResponse } from "next/server";
import { recordJourneyEmailTrackingEvent } from "@/lib/crm-journey-reporting";

const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAAIBRAA7",
  "base64",
);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") || "";
  if (token) {
    await recordJourneyEmailTrackingEvent(token, "opened", {
      userAgent: req.headers.get("user-agent")?.slice(0, 300) || "",
    }).catch(error => console.error("[Journey email open]", error));
  }
  return new NextResponse(PIXEL_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  });
}
