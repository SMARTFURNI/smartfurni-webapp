import { requireAdmin } from "@/lib/admin-auth";
import { getUserDashboardStats } from "@/lib/user-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import UserDashboardClient from "@/components/admin/UserDashboardClient";

export const metadata = { title: "Người dùng" };

export default async function AdminUsersPage() {
  await requireAdmin();
  const dashboardData = getUserDashboardStats();
  const sidebarStats = getSidebarStats();

  return (
    <div className="flex min-h-screen bg-[#080600]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title="Quản lý Người dùng" subtitle={`${dashboardData.stats.totalUsers} khách hàng trong hệ thống`} />
        <UserDashboardClient data={dashboardData} />
      </main>
    </div>
  );
}
