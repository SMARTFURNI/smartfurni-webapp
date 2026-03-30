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
  if (session.isAdmin) {
    // Admin: lấy thông tin admin từ database
    const { getStaffByUsername } = await import("@/lib/crm-staff-store");
    currentStaff = await getStaffByUsername("admin");
  } else if (session.staffId) {
    // Nhân viên: lấy thông tin của họ
    currentStaff = await getStaffById(session.staffId);
  }

  const staffName = currentStaff?.fullName ?? "";
  const staffRole = currentStaff?.role ?? "sales";
  const staffUsername = currentStaff?.username ?? "";
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
