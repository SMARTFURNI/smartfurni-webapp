import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getActivities, createActivity } from "@/lib/crm-store";

export async function GET(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });
  return NextResponse.json(await getActivities(leadId));
}

export async function POST(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const activity = await createActivity(body);
  return NextResponse.json(activity, { status: 201 });
}
