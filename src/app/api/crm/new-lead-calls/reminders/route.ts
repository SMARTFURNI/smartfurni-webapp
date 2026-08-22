import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { getNewLeadCallDashboard } from "@/lib/crm-new-lead-call-policy";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let assignedTo: string | undefined;
  if (!session.isAdmin && session.staffId) {
    const staff = await getStaffById(session.staffId);
    assignedTo = staff?.fullName || "__unassigned_staff__";
  }
  return NextResponse.json(await getNewLeadCallDashboard(assignedTo));
}
