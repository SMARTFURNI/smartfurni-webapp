import { NextRequest, NextResponse } from "next/server";
import {
  getSmartBedSession,
  markSmartBedAppInstalled,
  recordSmartBedAppEvent,
  type SmartBedAppEventType,
} from "@/lib/smart-bed-auth";
import { detectSmartBedPlatform } from "@/lib/smart-bed-platform";

const ALLOWED_EVENTS = new Set<SmartBedAppEventType>([
  "qr_login",
  "install_prompt_shown",
  "install_click",
  "install_dismissed",
  "installed",
]);

export async function POST(request: NextRequest) {
  const user = await getSmartBedSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  try {
    const body = await request.json() as { eventType?: SmartBedAppEventType; source?: string; platform?: string };
    if (!body.eventType || !ALLOWED_EVENTS.has(body.eventType)) {
      return NextResponse.json({ error: "Sự kiện không hợp lệ" }, { status: 400 });
    }
    const platform = body.platform || detectSmartBedPlatform(request.headers.get("user-agent") || "");
    await recordSmartBedAppEvent({
      eventType: body.eventType,
      userId: user.id,
      platform,
      source: body.source || "direct",
    });
    if (body.eventType === "installed") {
      await markSmartBedAppInstalled(user.id, `${platform}-pwa`);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể ghi nhận sự kiện." },
      { status: 400 },
    );
  }
}
