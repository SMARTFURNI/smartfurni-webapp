import { requireAdmin } from "@/lib/admin-auth";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSettingsClient from "@/components/admin/AdminSettingsClient";

export const metadata = { title: "Cài đặt" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const sidebarStats = getSidebarStats();

  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title="Cài đặt hệ thống" subtitle="Cấu hình tài khoản, website và thông báo" />
        <AdminSettingsClient />
      </main>
    </div>
  );
}
