import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getProductById } from "@/lib/product-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import ProductFormClient from "@/components/admin/ProductFormClient";

export const metadata = { title: "Chỉnh sửa sản phẩm" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();
  const sidebarStats = getSidebarStats();
  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title={`Chỉnh sửa: ${product.name}`} subtitle="Cập nhật thông tin sản phẩm" />
        <ProductFormClient product={product} />
      </main>
    </div>
  );
}
