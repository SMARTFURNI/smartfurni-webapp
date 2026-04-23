import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getOrderById } from "@/lib/order-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import OrderFormClient from "@/components/admin/OrderFormClient";
import { initDbOnce } from "@/lib/db-init";

export const metadata = { title: "Chỉnh sửa đơn hàng" };

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await initDbOnce();
  await requireAdmin();
  const { id } = await params;
  const order = getOrderById(id);
  if (!order) notFound();
  const sidebarStats = getSidebarStats();
  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title={`Chỉnh sửa đơn: ${order.orderNumber}`} subtitle={`Khách hàng: ${order.customerName}`} />
        <OrderFormClient order={order} />
      </main>
    </div>
  );
}
