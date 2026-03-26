import { getCrmSession } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { NextRequest, NextResponse } from "next/server";
import { claimRawLead } from "@/lib/crm-raw-lead-store";

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    let staffId: string;
    let staffName: string;

    if (session.isAdmin) {
      // Admin tự nhận thì dùng tên "Admin"
      staffId = "admin";
      staffName = "Admin";
    } else {
      if (!session.staffId) return NextResponse.json({ error: "No staff session" }, { status: 401 });
      const staff = await getStaffById(session.staffId);
      if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      staffId = staff.id;
      staffName = staff.fullName;
    }

    const result = await claimRawLead(id, staffId, staffName);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json(result.lead);
  } catch (e) {
    console.error("[raw-leads claim]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
