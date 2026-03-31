import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getCrmSettings } from "@/lib/crm-settings-store";

// Public endpoint cho CRM staff (không cần superAdmin) để lấy leadTypes
export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getCrmSettings();
  return NextResponse.json(settings.leadTypes ?? []);
}
