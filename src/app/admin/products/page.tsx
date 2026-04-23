import { requireAdmin } from "@/lib/admin-auth";
import { getProductDashboardStats } from "@/lib/product-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import ProductDashboardClient from "@/components/admin/ProductDashboardClient";

export const metadata = { title: "Sản phẩm" };

export default async function AdminProductsPage() {
  await requireAdmin();
  const dashboardData = getProductDashboardStats();
  const sidebarStats = getSidebarStats();

  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title="Quản lý Sản phẩm" subtitle={`${dashboardData.stats.totalProducts} sản phẩm · ${dashboardData.stats.lowStockCount} sắp hết hàng`} />
        <ProductDashboardClient data={dashboardData} />
      </main>
    </div>
  );
}
