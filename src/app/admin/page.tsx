import { requireAdmin } from "@/lib/admin-auth";
import { getDashboardStats } from "@/lib/admin-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardClient from "@/components/admin/DashboardClient";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await requireAdmin();
  const dashboardData = getDashboardStats();
  const sidebarStats = getSidebarStats();

  return (
    <div className="flex min-h-screen bg-[#080600]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <DashboardClient data={dashboardData} />
      </main>
    </div>
  );
}
