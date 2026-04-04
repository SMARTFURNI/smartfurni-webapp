import { NextRequest, NextResponse } from "next/server";
import { getZaloSettings, updateZaloSetting, getZaloMyProfile } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
  try {
    const body = await request.json();
    const { settingKey, settingValue } = body;
    if (!settingKey) return NextResponse.json({ success: false, error: "settingKey required" }, { status: 400 });
    return NextResponse.json(await updateZaloSetting(settingKey, settingValue));
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
