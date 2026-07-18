import { requireAdmin } from "@/lib/admin-auth";
import { getDashboardStats } from "@/lib/admin-store";
import { getOrderDashboardStats } from "@/lib/order-store";
import { getProductDashboardStats } from "@/lib/product-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardClient from "@/components/admin/DashboardClient";
import { initDbOnce } from "@/lib/db-init";
import { redirect } from "next/navigation";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  if (source === "pwa") {
    redirect("/admin/choose-module?source=pwa&entry=admin");
  }

  await requireAdmin();
  await initDbOnce();
  const blogData = getDashboardStats();
  const orderData = getOrderDashboardStats();
  const productData = getProductDashboardStats();
  const sidebarStats = getSidebarStats();

  return (
    <div className="flex min-h-screen bg-[#130e00]">
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
