import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAnalyticsData, initAnalyticsTables } from "@/lib/analytics-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

let tablesInitialized = false;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!tablesInitialized) {
    await initAnalyticsTables();
    tablesInitialized = true;
  }

  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") || "month") as "day" | "week" | "month" | "year" | "all";

  const data = await getAnalyticsData(range);
  return NextResponse.json(data);
}
