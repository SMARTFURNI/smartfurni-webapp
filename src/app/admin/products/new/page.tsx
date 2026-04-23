import { requireAdmin } from "@/lib/admin-auth";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import ProductFormClient from "@/components/admin/ProductFormClient";

export const metadata = { title: "Thêm sản phẩm" };

export default async function NewProductPage() {
  await requireAdmin();
  const sidebarStats = getSidebarStats();
  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title="Thêm sản phẩm mới" subtitle="Tạo sản phẩm mới trong danh mục SmartFurni" />
        <ProductFormClient />
      </main>
    </div>
  );
}
