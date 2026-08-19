import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { listActiveZaloConnectionAlerts } from "@/lib/zalo-inbox-alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const alerts = await listActiveZaloConnectionAlerts();
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("[Zalo Connection Alerts] GET:", error);
    return NextResponse.json({ error: "Không tải được cảnh báo kết nối Zalo" }, { status: 500 });
  }
}
