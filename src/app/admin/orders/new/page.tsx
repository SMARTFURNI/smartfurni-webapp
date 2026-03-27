import { requireAdmin } from "@/lib/admin-auth";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import OrderFormClient from "@/components/admin/OrderFormClient";

export const metadata = { title: "Tạo đơn hàng" };

export default async function NewOrderPage() {
  await requireAdmin();
  const sidebarStats = getSidebarStats();
  return (
    <div className="flex min-h-screen bg-[#080600]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title="Tạo đơn hàng mới" subtitle="Nhập thông tin đơn hàng thủ công" />
        <OrderFormClient />
      </main>
    </div>
  );
}
