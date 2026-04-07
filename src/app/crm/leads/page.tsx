import { getLeads, type Lead } from "@/lib/crm-store";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { getRoleById } from "@/lib/crm-roles-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import LeadsListClient from "@/components/crm/LeadsListClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const session = await requireCrmAccess();

  let staffName: string | undefined;
  let canViewAll = session.isAdmin; // Admin luôn xem được tất cả

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

  let leads: Lead[] = [];
  try {
    leads = await getLeads(staffFilter);
  } catch (err) {
    console.error("[crm/leads] Failed to load leads:", err);
  }

  // Pre-load leadTypes server-side để tránh flash khi render
  const settings = await getCrmSettings().catch(() => null);
  const leadTypes = settings?.leadTypes ?? [];

  return <LeadsListClient initialLeads={leads} isAdmin={session.isAdmin || canViewAll} currentUserName={staffName || ""} initialLeadTypes={leadTypes} />;
}
