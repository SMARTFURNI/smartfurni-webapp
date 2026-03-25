import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getLeads, createLead } from "@/lib/crm-store";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const leads = await getLeads({
      stage: searchParams.get("stage") as any || undefined,
      district: searchParams.get("district") || undefined,
      type: searchParams.get("type") as any || undefined,
      search: searchParams.get("search") || undefined,
    });
    return NextResponse.json(leads);
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const lead = await createLead(body);
    return NextResponse.json(lead, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
