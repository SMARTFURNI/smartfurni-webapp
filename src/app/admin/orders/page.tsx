import { requireAdmin } from "@/lib/admin-auth";
import { getOrderDashboardStats } from "@/lib/order-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import OrderDashboardClient from "@/components/admin/OrderDashboardClient";

export const metadata = { title: "Đơn hàng" };

export default async function AdminOrdersPage() {
  await requireAdmin();
  const dashboardData = getOrderDashboardStats();
  const sidebarStats = getSidebarStats();
  const pending = dashboardData.ordersByStatus.find(s => s.status === "pending")?.count || 0;

  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title="Quản lý Đơn hàng" subtitle={`${dashboardData.stats.totalOrders} đơn hàng · ${pending} chờ xác nhận`} />
        <OrderDashboardClient data={dashboardData} />
      </main>
    </div>
  );
}
