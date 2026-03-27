import { getCrmSession } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { NextRequest, NextResponse } from "next/server";
import { assignRawLead } from "@/lib/crm-raw-lead-store";

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
  }

  try {
    const { id, staffId } = await req.json();
    if (!id || !staffId) return NextResponse.json({ error: "Missing id or staffId" }, { status: 400 });

    const staff = await getStaffById(staffId);
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    const result = await assignRawLead(id, staff.id, staff.fullName);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json(result.lead);
  } catch (e) {
    console.error("[raw-leads assign]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
