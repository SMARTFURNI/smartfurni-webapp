import { getLeads } from "@/lib/crm-store";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import KanbanClient from "@/components/crm/KanbanClient";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const session = await requireCrmAccess();

  let staffName: string | undefined;
  if (!session.isAdmin && session.staffId) {
    const staff = await getStaffById(session.staffId);
    staffName = staff?.fullName;
  }

  // Admin thấy tất cả, nhân viên chỉ thấy leads được giao cho mình
  const staffFilter = (!session.isAdmin && staffName) ? { assignedTo: staffName } : undefined;

  const leads = await getLeads(staffFilter);
  return <KanbanClient initialLeads={leads} isAdmin={session.isAdmin} currentUserName={staffName || ""} />;
}
