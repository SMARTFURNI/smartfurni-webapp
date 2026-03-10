import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getUserById } from "@/lib/user-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import UserFormClient from "@/components/admin/UserFormClient";

export const metadata = { title: "Chỉnh sửa khách hàng" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const user = getUserById(id);
  if (!user) notFound();
  const sidebarStats = getSidebarStats();
  return (
    <div className="flex min-h-screen bg-[#080600]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title={`Chỉnh sửa: ${user.name}`} subtitle={user.email || user.phone} />
        <UserFormClient user={user} />
      </main>
    </div>
  );
}
