import { NextRequest, NextResponse } from "next/server";
import { recordAutomationLinkTrackingClick } from "@/lib/crm-automation-link-tracking";
import { recordJourneyEmailTrackingEvent } from "@/lib/crm-journey-reporting";

function safeDestination(value: string): string {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "https://www.smartfurni.com.vn";
  } catch {
    return "https://www.smartfurni.com.vn";
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") || "";
  const destination = safeDestination(req.nextUrl.searchParams.get("u") || "");
  if (token) {
    const recordedForJourney = await recordJourneyEmailTrackingEvent(token, "clicked", { url: destination })
      .catch(error => {
        console.error("[Journey email click]", error);
        return false;
      });
    if (!recordedForJourney) {
      await recordAutomationLinkTrackingClick(token, destination)
        .catch(error => console.error("[Automation Zalo click]", error));
    }
  }
  return NextResponse.redirect(destination, { status: 302 });
}
