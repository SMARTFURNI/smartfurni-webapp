import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getCallAnalytics } from "@/lib/crm-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filters: Parameters<typeof getCallAnalytics>[0] = {};

  // Nhân viên chỉ xem analytics của mình
  if (!session.isAdmin && session.staffId) {
    filters.staffId = session.staffId;
  } else if (searchParams.get("staffId")) {
    filters.staffId = searchParams.get("staffId")!;
  }

  if (searchParams.get("dateFrom")) filters.dateFrom = searchParams.get("dateFrom")!;
  if (searchParams.get("dateTo")) filters.dateTo = searchParams.get("dateTo")!;

  const analytics = await getCallAnalytics(filters);
  return NextResponse.json(analytics);
}
