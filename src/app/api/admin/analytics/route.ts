import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAnalyticsData, initAnalyticsTables, type AnalyticsRange } from "@/lib/analytics-store";

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
  const requestedRange = searchParams.get("range") || "month";
  const allowedRanges: AnalyticsRange[] = ["day", "week", "month", "quarter", "year", "all"];
  const range: AnalyticsRange = allowedRanges.includes(requestedRange as AnalyticsRange)
    ? requestedRange as AnalyticsRange
    : "month";

  const data = await getAnalyticsData(range);
  return NextResponse.json(data);
}
