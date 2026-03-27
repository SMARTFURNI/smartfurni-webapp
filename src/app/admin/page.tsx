import { requireAdmin } from "@/lib/admin-auth";
import { getDashboardStats } from "@/lib/admin-store";
import { getOrderDashboardStats } from "@/lib/order-store";
import { getProductDashboardStats } from "@/lib/product-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardClient from "@/components/admin/DashboardClient";

export const metadata = { title: "Dashboard — SmartFurni Admin" };

export default async function AdminDashboardPage() {
  await requireAdmin();
  const blogData = getDashboardStats();
  const orderData = getOrderDashboardStats();
  const productData = getProductDashboardStats();
  const sidebarStats = getSidebarStats();

  return (
    <div className="flex min-h-screen bg-[#080600]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 overflow-auto min-w-0">
        <DashboardClient
          blogData={blogData}
          orderData={orderData}
          productData={productData}
        />
      </main>
    </div>
  );
}
