import { NextRequest, NextResponse } from "next/server";
import { getSmartBedSession, markSmartBedAppInstalled } from "@/lib/smart-bed-auth";

export async function POST(request: NextRequest) {
  const user = await getSmartBedSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { platform?: string };
  await markSmartBedAppInstalled(user.id, body.platform || "pwa");
  return NextResponse.json({ success: true });
}
