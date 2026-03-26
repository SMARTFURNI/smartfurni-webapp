import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { getLeads, getTasks, getQuotes, getCrmStats } from "@/lib/crm-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import CrmDashboardClient from "@/components/crm/CrmDashboardClient";

export const dynamic = "force-dynamic";

export default async function CrmDashboardPage() {
  const session = await requireCrmAccess();

  // Lấy thông tin nhân viên đang đăng nhập
  let currentStaff = null;
  if (!session.isAdmin && session.staffId) {
    currentStaff = await getStaffById(session.staffId);
  }

  const staffName = currentStaff?.fullName ?? (session.isAdmin ? "Quản trị viên" : "");
  const staffRole = currentStaff?.role ?? (session.isAdmin ? "super_admin" : "sales");
  const staffUsername = currentStaff?.username ?? (session.isAdmin ? "admin" : "");
  const staffId = currentStaff?.id ?? null;

  // Admin thấy tất cả, nhân viên chỉ thấy leads được giao cho mình
  const staffFilter = (!session.isAdmin && staffName) ? { assignedTo: staffName } : undefined;

  const [leads, tasks, quotes, stats, crmSettings] = await Promise.all([
    getLeads(staffFilter),
    getTasks({ dueToday: true, ...(staffFilter ?? {}) }),
    getQuotes(),
    getCrmStats(staffFilter),
    getCrmSettings(),
  ]);

  return (
    <CrmDashboardClient
      leads={leads}
      todayTasks={tasks}
      quotes={quotes}
      stats={stats}
      dashboardTheme={crmSettings.dashboardTheme}
      currentUser={{
        name: staffName,
        username: staffUsername,
        role: staffRole,
        isAdmin: session.isAdmin,
        staffId: staffId ?? undefined,
      }}
    />
  );
}
