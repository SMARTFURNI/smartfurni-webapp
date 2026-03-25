import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getCrmSettings, updateCrmSetting, resetCrmSetting, CrmSettings } from "@/lib/crm-settings-store";

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getCrmSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { key, value } = body as { key: keyof CrmSettings; value: CrmSettings[keyof CrmSettings] };
  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }
  await updateCrmSetting(key, value as never);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { key } = await req.json() as { key: keyof CrmSettings };
  await resetCrmSetting(key);
  return NextResponse.json({ ok: true });
}
