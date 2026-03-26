import { getCrmSession } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { NextRequest, NextResponse } from "next/server";
import { getLeads, createLead } from "@/lib/crm-store";

export async function GET(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  try {
    const body = await req.json();
    // Nếu là nhân viên (không phải admin) và chưa có assignedTo, tự động gán tên nhân viên
    if (!session.isAdmin && session.staffId && !body.assignedTo) {
      const staff = await getStaffById(session.staffId);
      if (staff?.fullName) {
        body.assignedTo = staff.fullName;
      }
    }
    const lead = await createLead(body);
    return NextResponse.json(lead, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
