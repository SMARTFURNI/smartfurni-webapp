export const dynamic = "force-dynamic";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById, getAllStaff } from "@/lib/crm-staff-store";
import { getTasks } from "@/lib/crm-store";
import type { CrmTask } from "@/lib/crm-types";
import TasksListClient from "@/components/crm/TasksListClient";

export default async function CrmTasksPage() {
  const session = await requireCrmAccess();

  let staffName: string | undefined;
  if (!session.isAdmin && session.staffId) {
    const staff = await getStaffById(session.staffId);
    staffName = staff?.fullName;
  }

  // Role-based filter: staff chỉ thấy tasks của mình
  const staffFilter = (!session.isAdmin && staffName) ? { assignedTo: staffName } : undefined;

  let tasks: CrmTask[] = [];
  try {
    tasks = await getTasks(staffFilter);
  } catch (err) {
    console.error("[crm/tasks] Failed to load tasks:", err);
  }

  // Admin: lấy danh sách nhân viên để filter/assign
  let staffList: { id: string; fullName: string }[] = [];
  if (session.isAdmin) {
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
      isAdmin={session.isAdmin}
      currentUserName={staffName || ""}
      staffList={staffList}
    />
  );
}
