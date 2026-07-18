import { NextRequest, NextResponse } from "next/server";
import { getSmartBedSession, markSmartBedAppInstalled, recordSmartBedAppEvent } from "@/lib/smart-bed-auth";

export async function POST(request: NextRequest) {
  const user = await getSmartBedSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { platform?: string };
  const platform = body.platform || "pwa";
  await Promise.all([
    markSmartBedAppInstalled(user.id, platform),
    recordSmartBedAppEvent({ eventType: "installed", userId: user.id, platform, source: "pwa" }),
  ]);
  return NextResponse.json({ success: true });
}
