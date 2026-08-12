import { NextRequest, NextResponse } from "next/server";
import { getZaloSettings, updateZaloSetting, getZaloMyProfile } from "@/lib/zalo-gateway";
import { getAuthorizedZaloInboxSession } from "@/lib/zalo-inbox-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await getAuthorizedZaloInboxSession()) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "settings";

  try {
    switch (action) {
      case "profile":
        return NextResponse.json(await getZaloMyProfile());
      case "settings":
      default:
        return NextResponse.json(await getZaloSettings());
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthorizedZaloInboxSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Chỉ quản trị viên được thay đổi cài đặt Zalo" }, { status: 403 });
  try {
    const body = await request.json();
    const { settingKey, settingValue } = body;
    if (!settingKey) return NextResponse.json({ success: false, error: "settingKey required" }, { status: 400 });
    return NextResponse.json(await updateZaloSetting(settingKey, settingValue));
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
