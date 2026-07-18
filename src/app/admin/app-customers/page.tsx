import { requireAdmin } from "@/lib/admin-auth";
import { getSidebarStats } from "@/lib/sidebar-stats";
import { getSmartBedAdminCustomers } from "@/lib/smart-bed-auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import SmartBedCustomersClient from "@/components/admin/SmartBedCustomersClient";

export const metadata = { title: "Khách hàng App | SmartFurni Admin" };

export default async function AdminAppCustomersPage() {
  await requireAdmin();
  const [customers, sidebarStats] = await Promise.all([
    getSmartBedAdminCustomers(),
    getSidebarStats(),
  ]);

  return (
    <div className="flex min-h-screen bg-[#0b1019]">
      <AdminSidebar stats={sidebarStats} />
      <main className="min-w-0 flex-1 overflow-auto p-4 md:p-8">
        <AdminHeader title="Khách hàng App Điều Khiển" subtitle={`${customers.length} tài khoản khách hàng đã tạo`} />
        <SmartBedCustomersClient initialCustomers={customers} />
      </main>
    </div>
  );
}
