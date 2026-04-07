export const dynamic = "force-dynamic";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById, getAllStaff } from "@/lib/crm-staff-store";
import { getRoleById } from "@/lib/crm-roles-store";
import { getTasks } from "@/lib/crm-store";
import type { CrmTask } from "@/lib/crm-types";
import TasksListClient from "@/components/crm/TasksListClient";

export default async function CrmTasksPage() {
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

  // canViewAll: xem tất cả; còn lại chỉ xem tasks của mình
  const staffFilter = (!canViewAll && staffName) ? { assignedTo: staffName } : undefined;

  let tasks: CrmTask[] = [];
  try {
    tasks = await getTasks(staffFilter);
  } catch (err) {
    console.error("[crm/tasks] Failed to load tasks:", err);
  }

  // Admin hoặc leader (canViewAll): lấy danh sách nhân viên để filter/assign
  let staffList: { id: string; fullName: string }[] = [];
  if (canViewAll) {
    try {
      const allStaff = await getAllStaff();
      staffList = allStaff.map(s => ({ id: s.id, fullName: s.fullName }));
    } catch {
      // ignore
    }
  }

  return (
    <TasksListClient
      initialTasks={tasks}
      isAdmin={session.isAdmin || canViewAll}
      currentUserName={staffName || ""}
      staffList={staffList}
    />
  );
}
