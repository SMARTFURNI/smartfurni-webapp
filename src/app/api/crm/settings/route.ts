import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getCrmSettings, updateCrmSetting, resetCrmSetting, CrmSettings } from "@/lib/crm-settings-store";

export async function GET() {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getCrmSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { key, value } = body as { key: keyof CrmSettings; value: CrmSettings[keyof CrmSettings] };
  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }
  if (key === "pipeline" || key === "leadTypes") {
    return NextResponse.json({
      error: "Danh mục lõi được chuẩn hóa dùng chung toàn CRM và không chỉnh sửa tại endpoint này.",
    }, { status: 409 });
  }
  await updateCrmSetting(key, value as never);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { key } = await req.json() as { key: keyof CrmSettings };
  if (key === "pipeline" || key === "leadTypes") {
    return NextResponse.json({
      error: "Danh mục lõi được chuẩn hóa dùng chung toàn CRM và không thể đặt lại tại endpoint này.",
    }, { status: 409 });
  }
  await resetCrmSetting(key);
  return NextResponse.json({ ok: true });
}
