import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getRawLeadStats } from "@/lib/crm-raw-lead-store";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const stats = await getRawLeadStats();
    return NextResponse.json(stats);
  } catch (e) {
    console.error("[raw-leads stats]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
