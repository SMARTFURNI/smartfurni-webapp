import { requireAdmin } from "@/lib/admin-auth";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import UserFormClient from "@/components/admin/UserFormClient";

export const metadata = { title: "Thêm khách hàng" };

export default async function NewUserPage() {
  await requireAdmin();
  const sidebarStats = getSidebarStats();
  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title="Thêm khách hàng mới" subtitle="Tạo hồ sơ khách hàng trong hệ thống" />
        <UserFormClient />
      </main>
    </div>
  );
}
