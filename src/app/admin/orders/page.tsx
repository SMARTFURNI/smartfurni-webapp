import { requireAdmin } from "@/lib/admin-auth";
import { getOrderDashboardStats } from "@/lib/order-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import OrderDashboardClient from "@/components/admin/OrderDashboardClient";
import { initDbOnce } from "@/lib/db-init";

export const metadata = { title: "Đơn hàng" };

export default async function AdminOrdersPage() {
  await requireAdmin();
  await initDbOnce();
  const dashboardData = getOrderDashboardStats();
  const sidebarStats = getSidebarStats();
  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <OrderDashboardClient data={dashboardData} />
      </main>
    </div>
  );
}
