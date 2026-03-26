import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getRawLeads, createRawLead } from "@/lib/crm-raw-lead-store";
import type { RawLeadSource, RawLeadStatus } from "@/lib/crm-raw-lead-store";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const result = await getRawLeads({
      status: (searchParams.get("status") as RawLeadStatus) || undefined,
      source: (searchParams.get("source") as RawLeadSource) || undefined,
      search: searchParams.get("search") || undefined,
      limit: parseInt(searchParams.get("limit") || "50"),
      offset: parseInt(searchParams.get("offset") || "0"),
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[raw-leads GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const lead = await createRawLead(body);
    return NextResponse.json(lead, { status: 201 });
  } catch (e) {
    console.error("[raw-leads POST]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
