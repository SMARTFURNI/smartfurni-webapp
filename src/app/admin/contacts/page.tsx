import { requireAdmin } from "@/lib/admin-auth";
import { getAllContacts } from "@/lib/admin-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminContactsClient from "@/components/admin/AdminContactsClient";
import { initDbOnce } from "@/lib/db-init";

export const metadata = { title: "Liên hệ" };

export default async function AdminContactsPage() {
  await initDbOnce();
  await requireAdmin();
  const contacts = getAllContacts();
  const sidebarStats = getSidebarStats();
  const unread = contacts.filter(c => !c.read).length;

  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title="Quản lý Liên hệ" subtitle={`${contacts.length} tin nhắn · ${unread} chưa đọc`} />
        <AdminContactsClient initialContacts={contacts} />
      </main>
    </div>
  );
}
