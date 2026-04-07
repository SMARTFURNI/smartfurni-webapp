import { getLeads } from "@/lib/crm-store";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { getRoleById } from "@/lib/crm-roles-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import KanbanClient from "@/components/crm/KanbanClient";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const session = await requireCrmAccess();

  let staffName: string | undefined;
  let canViewAll = session.isAdmin;

  if (!session.isAdmin && session.staffId) {
    const staff = await getStaffById(session.staffId);
    staffName = staff?.fullName;

    // Kiểm tra permission leads_view_all từ DB
    if (staff?.role) {
      const roleData = await getRoleById(staff.role);
      if (roleData?.permissions?.leads_view_all) {
        canViewAll = true;
      }
    }
  }

  // canViewAll: xem tất cả; còn lại chỉ xem leads được giao cho mình
  const staffFilter = (!canViewAll && staffName) ? { assignedTo: staffName } : undefined;
  const leads = await getLeads(staffFilter);

  // Pre-load leadTypes server-side để tránh flash khi render
  const settings = await getCrmSettings().catch(() => null);
  const leadTypes = settings?.leadTypes ?? [];

  return <KanbanClient initialLeads={leads} isAdmin={session.isAdmin || canViewAll} currentUserName={staffName || ""} initialLeadTypes={leadTypes} />;
}
