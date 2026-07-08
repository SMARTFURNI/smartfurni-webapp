import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getBusinessBrainReport } from "@/lib/business-brain-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ report: await getBusinessBrainReport() });
}
