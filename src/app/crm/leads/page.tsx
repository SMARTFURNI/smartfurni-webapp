import { getLeads, type Lead } from "@/lib/crm-store";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import LeadsListClient from "@/components/crm/LeadsListClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const session = await requireCrmAccess();

  let staffName: string | undefined;
  if (!session.isAdmin && session.staffId) {
    const staff = await getStaffById(session.staffId);
    staffName = staff?.fullName;
  }

  // Admin thấy tất cả, nhân viên chỉ thấy leads được giao cho mình
  const staffFilter = (!session.isAdmin && staffName) ? { assignedTo: staffName } : undefined;

  let leads: Lead[] = [];
  try {
    leads = await getLeads(staffFilter);
  } catch (err) {
    console.error("[crm/leads] Failed to load leads:", err);
  }

  return <LeadsListClient initialLeads={leads} isAdmin={session.isAdmin} currentUserName={staffName || ""} />;
}
